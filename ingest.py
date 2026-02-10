import os
import time
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# 1. 환경 변수 로드
load_dotenv()

# 2. 임베딩 모델 설정
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

# 3. 경로 설정
DATA_FOLDER = "./data"
DB_PATH = "./db_chroma"

def ingest_data():
    if not os.path.exists(DATA_FOLDER):
        print(f"❌ '{DATA_FOLDER}' 폴더가 없습니다!")
        return

    # PDF 파일 찾기
    pdf_files = [f for f in os.listdir(DATA_FOLDER) if f.endswith('.pdf')]
    if not pdf_files:
        print(f"❌ '{DATA_FOLDER}' 폴더에 PDF 파일이 없습니다!")
        return

    documents = []
    print(f"📂 발견된 규정집: {pdf_files}")

    # 4. PDF 로드
    for pdf_file in pdf_files:
        file_path = os.path.join(DATA_FOLDER, pdf_file)
        print(f"🚀 로딩 중: {pdf_file} ...")
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        documents.extend(docs)

    print(f"✅ 총 {len(documents)} 페이지 로드 완료!")

    # 5. 텍스트 쪼개기
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=5000,
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""]
    )
    splits = text_splitter.split_documents(documents)
    print(f"✂️ 총 {len(splits)}개의 조각(Chunk)으로 분할되었습니다.")

    # 6. 벡터 DB 생성 (여기서부터 수정됨!)
    print("💾 벡터 데이터베이스 저장 시작...")

    # 빈 DB를 먼저 만듭니다
    vectorstore = Chroma(
        persist_directory=DB_PATH,
        embedding_function=embeddings
    )

    # 💡 중요: 100개씩 끊어서 저장 (Batch Processing)
    batch_size = 100
    total_batches = (len(splits) + batch_size - 1) // batch_size

    for i in range(0, len(splits), batch_size):
        batch = splits[i : i + batch_size]
        print(f"📦 배치 처리 중... ({i // batch_size + 1}/{total_batches}) - {len(batch)}개 저장")
        vectorstore.add_documents(batch)
        time.sleep(0.5) # API 과부하 방지를 위해 0.5초 휴식

    print("🎉 모든 데이터 저장 완료! './db_chroma' 폴더를 확인하세요.")

if __name__ == "__main__":
    ingest_data()