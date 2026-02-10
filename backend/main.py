from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
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

session_store = {}

def get_session_history(session_id: str):
    if session_id not in session_store:
        session_store[session_id] = ChatMessageHistory()
    return session_store[session_id]

# 6. RAG 체인 (가드레일 & 조항 명시 프롬프트 장착)
def get_rag_chain():
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    base_retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 2}
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
    당신은 K리그와 KBO 규정에 대해 친절하고 정확하게 알려주는 전문 AI 에이전트 '책첵(Chaek-Check)'입니다. ⚽️⚾️

    [핵심 규칙 - 반드시 지킬 것]
    1. 철벽 방어 (Guardrail): 질문이 '축구(K리그)'나 '야구(KBO)' 규정과 전혀 관련이 없거나 일반적인 일상 질문이라면 "죄송합니다. 저는 K리그 및 KBO 규정 전문 에이전트입니다. 축구나 야구 규정에 대해서만 답변해 드릴 수 있습니다. 🙇‍♂️" 라고 대답하세요.
    2. 팩트 체크: 반드시 제공된 [Context] 안에서만 정답을 찾으세요. 없으면 모른다고 하세요.
    3. 조항 명시: 답변 시, [Context]에 명시된 조항 번호나 제목이 있다면 반드시 실제 내용에 기반하여 포함시키세요.    4. 가독성: 마크다운(글머리 기호, 굵은 글씨 등)을 적극적으로 활용하여 요약해 주세요.
    5. 답변 회피 금지 및 상세 정리 (매우 중요): "자세한 내용은 해당 조항을 참고하세요", "규정되어 있습니다" 등으로 답변을 얼버무리지 마세요. 사용자가 묻는 조건, 절차, 금액, 수치 등의 **구체적인 알맹이(핵심 내용)를 직접 발췌하여 끝까지 상세하게 정리해서 답변**해야 합니다.
    6. 이전 대화 의존 금지 (매우 중요): 이전 대화 기록은 문맥 파악용입니다. 규정의 구체적인 제재 내용, 수치, 금액 등은 절대 이전 대화에서 베껴오지 마시고 오직 현재 [Context]에서만 추출하세요.

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
    try:
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
            
        # 🚨 [추가된 로직] AI가 "철벽 방어" 멘트를 치면 출처 박스를 차단합니다!
        is_refusal = "죄송합니다" in final_answer and "에이전트" in final_answer

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

        return {
            "answer": final_answer,
            "sources": sources
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))