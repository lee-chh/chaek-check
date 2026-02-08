import streamlit as st
from dotenv import load_dotenv
import os

# .env 파일에서 API 키 불러오기
load_dotenv()

st.title("책첵 (Chaek-Check) ✅")
st.write("팀 체크메이트의 프로젝트가 시작되었습니다!")

# API 키 잘 가져오는지 테스트 (보안상 앞 5글자만 출력)
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    st.success(f"API 키 로드 성공! ({api_key[:5]}...)")
else:
    st.error("API 키를 찾을 수 없습니다. .env 파일을 확인하세요.")