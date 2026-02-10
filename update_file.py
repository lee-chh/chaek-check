import os
import argparse
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# 1. 환경 설정
load_dotenv()

DATA_FOLDER = "./data"
DB_PATH = "./db_chroma"

def update_specific_file(filename):
    # 2. DB 연결
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vectorstore = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)

    # 삭제할 대상 파일 경로 (메타데이터의 'source'와 일치해야 함)
    # ingest.py에서 "./data/파일명" 형태로 저장했을 것입니다.
    target_source = f"./data/{filename}"

    print(f"🔍 '{filename}' 파일 교체 작업을 시작합니다...")

    # 3. 기존 데이터 삭제 (Delete)
    # ChromaDB에서 source 메타데이터가 일치하는 모든 청크를 삭제합니다.
    try:
        # 현재 DB에 해당 파일이 있는지 확인 (get으로 조회)
        existing_docs = vectorstore.get(where={"source": target_source})
        if len(existing_docs['ids']) == 0:
            print(f"⚠️ 경고: DB에서 '{target_source}'를 찾을 수 없습니다. (삭제 건너뜀/새로 추가만 진행)")
        else:
            vectorstore.delete(where={"source": target_source})
            print(f"🗑️ 기존 데이터 삭제 완료! ({len(existing_docs['ids'])}개의 청크 삭제됨)")
    except Exception as e:
        print(f"❌ 삭제 중 오류 발생: {e}")
        return

    # 4. 수정된 파일 로드 및 추가 (Add)
    file_path = os.path.join(DATA_FOLDER, filename)
    if not os.path.exists(file_path):
        print(f"❌ 오류: '{file_path}' 파일이 실제 폴더에 없습니다!")
        return

    print(f"🚀 수정된 파일 로딩 중: {filename} ...")
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    # 5. 텍스트 분할 (ingest.py와 동일한 설정 유지 필수!)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,     # ingest.py와 맞춤
        chunk_overlap=50,   # ingest.py와 맞춤
        separators=["\n\n", "\n", " ", ""]
    )
    splits = text_splitter.split_documents(docs)
    print(f"✂️ {len(splits)}개의 새로운 조각으로 분할되었습니다.")

    # 6. DB에 추가
    print("💾 새로운 데이터 저장 중...")
    vectorstore.add_documents(splits)
    print(f"🎉 '{filename}' 교체 완료!")

if __name__ == "__main__":
    # 사용법: python update_file.py 파일명.pdf
    import sys
    if len(sys.argv) < 2:
        print("사용법: python update_file.py [파일명]")
        print("예시: python update_file.py football_kleague_regulation_2025.pdf")
    else:
        target_file = sys.argv[1]
        update_specific_file(target_file)