import os
import time
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

# 1. 환경 변수 로드
load_dotenv()
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

def ingest_data_to_pinecone():
    # 2. 데이터 준비 (기존과 동일)
    DATA_FOLDER = "./data"
    pdf_files = [f for f in os.listdir(DATA_FOLDER) if f.endswith('.pdf')]
    
    if not pdf_files:
        print("❌ 업로드할 PDF 파일이 없습니다.")
        return

    documents = []
    print(f"📂 발견된 규정집: {pdf_files}")

    for pdf_file in pdf_files:
        file_path = os.path.join(DATA_FOLDER, pdf_file)
        print(f"🚀 로딩 중: {pdf_file} ...")
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        documents.extend(docs)

    # 3. 텍스트 분할
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""]
    )
    splits = text_splitter.split_documents(documents)
    print(f"✂️ 총 {len(splits)}개의 조각으로 분할되었습니다.")

    # 4. Pinecone 연결 및 업로드
    print("☁️ Pinecone 클라우드로 데이터 전송 시작...")
    
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
    
    # 배치 처리 (100개씩 끊어서 업로드)
    batch_size = 100
    total_batches = (len(splits) + batch_size - 1) // batch_size

    for i in range(0, len(splits), batch_size):
        batch = splits[i : i + batch_size]
        print(f"📦 클라우드 업로드 중... ({i // batch_size + 1}/{total_batches})")
        
        # Pinecone에 문서 추가 (from_documents 대신 add_documents 사용 가능하지만 이게 더 간편)
        PineconeVectorStore.from_documents(
            documents=batch,
            embedding=embeddings,
            index_name=INDEX_NAME
        )
        time.sleep(1) # API 안정성 확보

    print("🎉 클라우드 업로드 완료! 이제 어디서든 접속 가능합니다.")

if __name__ == "__main__":
    ingest_data_to_pinecone()