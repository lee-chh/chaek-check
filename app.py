import streamlit as st
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

# 1. 환경 설정
load_dotenv()
st.set_page_config(page_title="책첵 (Cloud Edition)", page_icon="☁️")
st.title("☁️ 책첵 (Cloud Edition)")
st.caption("Pinecone 클라우드 DB 연동 완료! (Model: Large)")

# 2. Pinecone 데이터베이스 연결 (Large 모델 적용 필수!)
@st.cache_resource
def load_db():
    # ⚠️ 중요: 아까 ingest할 때 쓴 모델과 똑같아야 함!
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    index_name = os.getenv("PINECONE_INDEX_NAME")
    
    # Pinecone 인덱스에서 데이터 검색 도구 가져오기
    vectorstore = PineconeVectorStore.from_existing_index(
        index_name=index_name,
        embedding=embeddings
    )
    return vectorstore

vectorstore = load_db()

# 3. 세션 및 체인 설정
if "messages" not in st.session_state:
    st.session_state.messages = []
if "store" not in st.session_state:
    st.session_state.store = {}

def get_rag_chain():
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    # 기본 검색기 (벡터 검색) - Large 모델이라 성능 굿!
    base_retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    # Multi-Query 검색기 (BM25 대신 질문을 3개로 뻥튀기해서 커버)
    multi_query_retriever = MultiQueryRetriever.from_llm(
        retriever=base_retriever,
        llm=llm,
        include_original=True
    )

    # 대화 맥락 인식
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

    # 답변 생성
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

def get_session_history(session_id: str):
    if session_id not in st.session_state.store:
        st.session_state.store[session_id] = ChatMessageHistory()
    return st.session_state.store[session_id]

# 4. UI 구현
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("규정을 물어보세요!"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        rag_chain = get_rag_chain()
        conversational_rag_chain = RunnableWithMessageHistory(
            rag_chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer",
        )

        with st.spinner("☁️ Pinecone 클라우드에서 찾는 중..."):
            result = conversational_rag_chain.invoke(
                {"input": prompt},
                config={"configurable": {"session_id": "current_session"}}
            )
            full_response = result["answer"]
            message_placeholder.markdown(full_response)
            
            if "context" in result and result["context"]:
                with st.expander("📚 참고한 규정 (Cloud Source)"):
                    seen = set()
                    for doc in result["context"]:
                        key = doc.metadata.get("source", "") + str(doc.metadata.get("page", ""))
                        if key not in seen:
                            seen.add(key)
                            fname = os.path.basename(doc.metadata.get("source", "Unknown"))
                            # Pinecone은 page 숫자가 float로 저장될 때가 있어서 int 변환
                            page = int(doc.metadata.get("page", 0)) + 1
                            st.caption(f"📄 {fname} (p.{page})")
                            st.text(doc.page_content[:100] + "...")

    st.session_state.messages.append({"role": "assistant", "content": full_response})