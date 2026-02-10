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

# 3. CORS 설정 (프론트엔드와 통신하기 위해 필수!)
# 나중에 배포할 때 allow_origins를 프론트엔드 도메인으로 바꿔야 하지만, 지금은 모든 곳(*)에서 허용.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 데이터베이스 및 체인 로드 (전역 변수로 설정)
# 서버가 켜질 때 한 번만 로딩해서 속도를 높임
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
index_name = os.getenv("PINECONE_INDEX_NAME")
vectorstore = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)

# 메모리 저장소 (간단하게 딕셔너리로 구현)
# 실제 배포시에는 Redis 등을 쓰는 게 좋지만 MVP는 이걸로 충분함
session_store = {}

def get_session_history(session_id: str):
    if session_id not in session_store:
        session_store[session_id] = ChatMessageHistory()
    return session_store[session_id]

# 5. RAG 체인 생성 함수
def get_rag_chain():
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    # 검색기 설정
    base_retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    # Multi-Query
    multi_query_retriever = MultiQueryRetriever.from_llm(
        retriever=base_retriever,
        llm=llm,
        include_original=True
    )

    # Contextualize Question
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
        llm, multi_query_retriever, contextualize_q_prompt
    )

    # Answer Generation
    qa_system_prompt = """
    당신은 한국 프로스포츠(K리그, KBO) 규정 전문가입니다.
    
    규칙:
    1. 반드시 [Context]에 있는 내용만 가지고 대답하세요.
    2. 질문의 의도(축구 vs 야구)를 정확히 파악해서 답변하세요.
    3. 규정에 없으면 모른다고 하세요.
    
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

# 체인 미리 생성 (속도 최적화)
rag_chain_instance = get_rag_chain()

# 6. 요청 데이터 모델 정의 (Pydantic)
class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session" # 사용자 구분을 위한 ID

# 7. API 엔드포인트 정의 (여기가 접속하는 문입니다!)
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
        
        # 참고 문서 정보 추출
        sources = []
        if "context" in result:
            seen = set()
            for doc in result["context"]:
                source = os.path.basename(doc.metadata.get("source", "Unknown"))
                page = int(doc.metadata.get("page", 0)) + 1
                key = f"{source}-{page}"
                if key not in seen:
                    seen.add(key)
                    sources.append({"file": source, "page": page, "preview": doc.page_content[:100]})

        return {
            "answer": result["answer"],
            "sources": sources
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))