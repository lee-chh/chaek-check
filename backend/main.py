from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.retrievers import MultiQueryRetriever
from dotenv import load_dotenv
import os
import time

# 1. 환경 변수 로드
load_dotenv()

# 2. FastAPI 앱 생성
app = FastAPI(title="책첵 API", description="K리그/KBO 규정 RAG 챗봇 서버")

# 3. CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. ✨ 파일명 -> 실제 규정명 번역 사전 (사용자 맞춤형)
REGULATION_NAMES = {
    "baseball_kbo_leagueregulations_2025.pdf": "2025 KBO 리그 규정",
    "baseball_kbo_officialbaseballrule_2025.pdf": "2025 공식야구규칙",
    "baseball_kbo_rule_2025.pdf": "2025 KBO 규약",
    "football_kleague_arbitration_2018.pdf": "K리그 중재위원회 운영 규정",
    "football_kleague_articles_2018.pdf": "K리그 정관",
    "football_kleague_cleanfinancial_2024.pdf": "K리그 재정건전화 규정",
    "football_kleague_cleanfinancial2_2024.pdf": "K리그 클럽 재정건전화 준수 세칙",
    "football_kleague_club_2018.pdf": "K리그 제1장 클럽 규정",
    "football_kleague_clublicesing_2024.pdf": "K리그 클럽 라이센싱 규정",
    "football_kleague_comissioner_2018.pdf": "K리그 총재선거관리규정",
    "football_kleague_ethics_2021.pdf": "K리그 윤리강령",
    "football_kleague_game_2018.pdf": "K리그 제3장 경기",
    "football_kleague_marketing_2018.pdf": "K리그 제5장 마케팅",
    "football_kleague_penalty_2018.pdf": "K리그 제6장 상벌",
    "football_kleague_player_2018.pdf": "K리그 제2장 선수",
    "football_kleague_proclubbteam_2021.pdf": "K리그 프로클럽 B팀 운영 세칙",
    "football_kleague_stadium_2024.pdf": "K리그 경기장 시설기준 가이드라인",
    "football_kleague_youthclubsystem_2018.pdf": "K리그 유소년 클럽 시스템 운영 세칙"
}

# 5. 데이터베이스 로드
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
index_name = os.getenv("PINECONE_INDEX_NAME")
vectorstore = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)

# 🟢 [신규] 라우터 출력 스키마 정의
class RouteQuery(BaseModel):
    domain: str = Field(description="분류 결과: 'K리그', 'KBO', '미지원스포츠', '비관련'")

# 🟢 [신규] 의도 분류 라우터 체인
def get_router_chain():
    # 라우팅은 속도가 생명이니 가장 빠르고 저렴한 모델을 씁니다.
    llm = ChatOpenAI(model="gpt-4.1-nano", temperature=0) 
    prompt = ChatPromptTemplate.from_messages([
        ("system", """당신은 질문 분류기입니다. 질문의 '종목'만 보고 다음 중 하나로 분류하세요:
        - 스포츠관련: K리그, KBO, 야구, 축구, 농구, 배구 등 모든 스포츠 관련 질문
        - 비관련: 일상 대화, 요리, 날씨 등 스포츠와 무관한 질문
        """),
        ("human", "{question}")
    ])
    # LLM이 무조건 RouteQuery 형식(JSON)으로만 대답하게 강제합니다.
    return prompt | llm.with_structured_output(RouteQuery)

router_chain = get_router_chain()

session_store = {}

def get_session_history(session_id: str):
    if session_id not in session_store:
        session_store[session_id] = ChatMessageHistory()
    return session_store[session_id]

# 6. RAG 체인 (가드레일 & 조항 명시 프롬프트 장착)
def get_rag_chain():
    llm = ChatOpenAI(model="gpt-4.1-nano", temperature=0)

    base_retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5}
    )

    contextualize_q_system_prompt = """
    주어진 채팅 기록과 최신 질문을 보고,
    이전 대화와 관련이 있다면 독립적인 질문으로 재구성하세요.
    """
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    history_aware_retriever = create_history_aware_retriever(
        llm, base_retriever, contextualize_q_prompt
    )

    qa_system_prompt = """
    당신은 스포츠 규정에 대해 친절하고 정확하게 알려주는 전문 AI 에이전트 '책첵(Chaek-Check)'입니다.

    [핵심 규칙 - 반드시 지킬 것]
    1. 근거 기반 답변: 반드시 제공된 [Context] 내의 정보로만 답변하세요.
    2. 우아한 거절: 만약 [Context]를 아무리 뒤져도 정답(수치, 조항 등)을 찾을 수 없다면, **다른 설명 덧붙이지 말고 오직 아래 문장만 출력하고 답변을 끝내세요.**
       "현재 책첵(Chaek-Check) 데이터 내에서는 해당 질문에 대한 명확한 조항을 찾을 수 없습니다. 🙇‍♂️"
    2. 가독성과 완결성 (매우 중요): 마크다운(글머리 기호, 굵은 글씨 등)을 활용해 상세하게 요약하세요. 사용자가 다른 문서를 찾아볼 필요가 없도록 조건, 절차, 수치 등 핵심 내용을 빠짐없이 작성하며 대화를 마무리하세요. ("자세한 내용은 참고하세요" 등 얼버무리기 절대 금지)
    3. 엄격한 출처 명시: 답변 시 [Context]에 '제O조' 같은 조항 번호가 명확히 보일 때만 언급하세요. 번호가 안 보이면 억지로 지어내지 말고 내용만 설명하세요. (없는 징계 조항 등 임의 창작 금지)
    4. 이전 대화 의존 금지: 이전 대화 기록은 문맥 파악용으로만 쓰세요. 규정의 구체적인 수치나 제재 금액은 오직 현재의 [Context]에서만 추출하고 이전 대화에서 베끼지 마세요.
    
    [Context]:
    {context}
    """
    qa_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", qa_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)
    return rag_chain

rag_chain_instance = get_rag_chain()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"

@app.get("/")
def read_root():
    return {"status": "ok", "message": "책첵 API 서버가 정상 작동 중입니다."}

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    start_time = time.time()
    
    try:
        # 1. 🟢 [신규 로직] DB 검색 전에 질문 의도부터 파악 (라우팅)
        classification = router_chain.invoke({"question": request.message})
        domain = classification.domain

        final_answer = ""
        sources = []
        is_refusal = False

        # 2. 🟢 [신규 로직] 라우팅 결과에 따른 완벽한 분기 처리 (Early Return)
        if domain == "비관련":
            final_answer = "죄송합니다. 저는 스포츠 규정 전문 에이전트 '책첵'입니다. 스포츠 규정과 관련된 질문에만 답변해 드릴 수 있습니다. 🙇‍♂️"
            is_refusal = True
            
        elif domain == "미지원스포츠":
            final_answer = "질문해주신 종목(또는 기관)의 규정은 현재 책첵(Chaek-Check)에 업데이트를 준비하고 있습니다! 🙇‍♂️ 현재 베타 버전에서는 K리그 및 KBO 관련 공식 규정을 중심으로 팩트체크를 지원하고 있습니다. 조금만 기다려 주시면 더 다양한 스포츠 규정으로 찾아뵙겠습니다."
            is_refusal = True
            
        else:
            conversational_rag_chain = RunnableWithMessageHistory(
                rag_chain_instance,
                get_session_history,
                input_messages_key="input",
                history_messages_key="chat_history",
                output_messages_key="answer",
            )
            
            result = conversational_rag_chain.invoke(
                {"input": request.message},
                config={"configurable": {"session_id": request.session_id}}
            )
            
            raw_answer = result["answer"]
            final_answer = raw_answer
            
            # 🟢 [수정된 로직] RAG가 정답을 못 찾고 '우아한 거절'을 했을 때 출처 카드를 차단합니다!
            is_refusal = "명확한 조항을 찾을 수 없습니다" in final_answer

            # 출처(Source) 가공 및 전달
            sources = []
            # 🚨 [수정된 로직] is_refusal이 아닐 때(정상 답변일 때)만 출처를 만듭니다!
            if "context" in result and not is_refusal: 
                seen = set()
                for doc in result["context"]:
                    raw_source = os.path.basename(doc.metadata.get("source", "Unknown"))
                    clean_source = REGULATION_NAMES.get(raw_source, raw_source.replace(".pdf", ""))
                    page = int(doc.metadata.get("page", 0)) + 1
                    key = f"{clean_source}-{page}"
                    
                    if key not in seen:
                        seen.add(key)
                        sources.append({
                            "file": clean_source,
                            "raw_file": raw_source,
                            "page": page,
                            "preview": doc.page_content[:100]
                        })
                sources = sources[:3]  # 최대 5개 출처까지만 전달
                        
        end_time = time.time()  # 🟢 3. 모든 작업이 끝난 후 스톱워치 종료!
        generation_time = round(end_time - start_time, 2)  # 소수점 둘째 자리까지 반올림 (예: 3.45)
        
        return {
            "answer": final_answer,
            "sources": sources,
            "generation_time": generation_time
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))