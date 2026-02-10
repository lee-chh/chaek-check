import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import styled from "styled-components";

// --- 스타일 컴포넌트 (CSS) ---
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f2f2f2; /* 카톡 배경색 */
  font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
`;

const Header = styled.div`
  background-color: #fff;
  padding: 15px;
  text-align: center;
  font-weight: bold;
  font-size: 1.2rem;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  z-index: 10;
`;

const ChatWindow = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const MessageBubble = styled.div`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 15px;
  font-size: 0.95rem;
  line-height: 1.5;
  position: relative;
  word-break: break-word;
  
  /* 내 메시지 (오른쪽, 노란색) */
  ${props => props.isUser ? `
    align-self: flex-end;
    background-color: #fee500;
    color: #000;
    border-top-right-radius: 0;
  ` : `
    align-self: flex-start;
    background-color: #fff;
    color: #000;
    border-top-left-radius: 0;
    border: 1px solid #ddd;
  `}
`;

const SourceBox = styled.div`
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px;
  font-size: 0.8rem;
  border: 1px solid #eee;

  h4 { margin: 0 0 5px 0; font-size: 0.85rem; color: #555; }
  ul { margin: 0; padding-left: 20px; }
  li { margin-bottom: 3px; color: #666; }
`;

const InputArea = styled.div`
  background-color: #fff;
  padding: 15px;
  display: flex;
  gap: 10px;
  border-top: 1px solid #ddd;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
  font-size: 1rem;
  &:focus { border-color: #fee500; }
`;

const Button = styled.button`
  background-color: #fee500;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
  &:disabled { background-color: #ddd; cursor: not-allowed; }
`;

// --- 메인 컴포넌트 ---
function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "안녕하세요! K리그 & KBO 규정집 챗봇 '책첵'입니다. 무엇이 궁금하신가요? 📚" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  // 스크롤 자동 내리기
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setLoading(true);

    // 1. 내 메시지 화면에 추가
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);

    try {
      // 2. 백엔드 API 호출 (로컬 테스트용 주소)
      const response = await axios.post("http://127.0.0.1:8000/chat", {
        message: userMsg,
        session_id: "user_1" // 세션 ID는 임시로 고정
      });

      // 3. AI 응답 화면에 추가
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.data.answer,
        sources: response.data.sources 
      }]);

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "죄송합니다. 서버와 연결할 수 없습니다. 😭" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>📚 책첵 (Chaek-Check)</Header>
      
      <ChatWindow>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
            <MessageBubble isUser={msg.role === "user"}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </MessageBubble>
            
            {/* 출처 표시 (AI 메시지이고 출처가 있을 때만) */}
            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
              <MessageBubble isUser={false} style={{ fontSize: "0.8rem", background: "#f1f1f1", marginTop: "-10px" }}>
                <strong>🔍 참고한 문서:</strong>
                <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                  {msg.sources.map((src, i) => (
                    <li key={i}>{src.file} (p.{src.page})</li>
                  ))}
                </ul>
              </MessageBubble>
            )}
          </div>
        ))}
        {loading && <div style={{textAlign: "center", color: "#888"}}>규정집 찾아보는 중... 🏃‍♂️</div>}
        <div ref={scrollRef} />
      </ChatWindow>

      <InputArea>
        <Input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="궁금한 규정을 입력하세요..."
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={loading}>
          전송
        </Button>
      </InputArea>
    </Container>
  );
}

export default App;