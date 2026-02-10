import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import styled, { createGlobalStyle, keyframes } from "styled-components";

// --- Global Styles & Animations ---
const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: transparent; /* 투명하게 변경! */
    overflow: hidden; 
  }
  
  * {
    box-sizing: border-box;
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// 🚨 에러 원인 해결: keyframes를 밖으로 안전하게 빼냈습니다.
const float = keyframes`
  0% { transform: translate(0, 0); }
  100% { transform: translate(30px, 50px); }
`;

// --- Styled Components (Apple Liquid Glass) ---
const Background = styled.div`
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at 10% 20%, rgba(216, 241, 230, 0.46) 0%, rgba(233, 226, 226, 0.28) 90.1%),
              radial-gradient(circle at 90% 10%, rgba(176, 218, 255, 1) 0%, rgba(200, 200, 255, 0.2) 90%);
  background-size: 200% 200%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative; /* fixed 대신 relative 적용 */
  
  &::before, &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.6;
    animation: ${float} 10s infinite ease-in-out alternate;
  }
  
  &::before {
    width: 400px;
    height: 400px;
    background: #ffdee9;
    background-image: linear-gradient(0deg, #ffdee9 0%, #b5fffc 100%);
    top: -100px;
    left: -100px;
  }

  &::after {
    width: 300px;
    height: 300px;
    background: #8BC6EC;
    background-image: linear-gradient(135deg, #8BC6EC 0%, #9599E2 100%);
    bottom: -50px;
    right: -50px;
  }
`;

const GlassContainer = styled.div`
  width: 90%;
  max-width: 900px;
  height: 90vh;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: all 0.5s ease;
`;

// 🚨 에러 원인 해결: 커스텀 속성명 앞에 $를 붙여서 에러를 막았습니다.
const HomeContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  gap: 30px;
  animation: ${fadeIn} 0.6s ease-out;
  display: ${props => props.$visible ? 'flex' : 'none'};
`;

const LogoTitle = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #333 0%, #666 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -1px;
  text-align: center;
  text-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const ExampleGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 600px;
`;

const ExampleChip = styled.button`
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 10px 18px;
  border-radius: 20px;
  font-size: 0.95rem;
  color: #444;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);

  &:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const SearchContainer = styled.div`
  width: 100%;
  max-width: 600px;
  position: relative;
  transition: all 0.5s ease;
  
  ${props => props.$isChatMode && `
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    max-width: 100%;
    padding: 20px;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255,255,255,0.5);
    z-index: 20;
  `}
`;

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 18px 50px 18px 24px;
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  color: #333;
  outline: none;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  transition: all 0.3s;
  backdrop-filter: blur(5px);

  &::placeholder {
    color: #999;
  }

  &:focus {
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 6px 24px rgba(0,0,0,0.1);
    border-color: rgba(0,0,0,0.1);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  position: absolute;
  right: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  box-shadow: 0 2px 8px rgba(118, 75, 162, 0.4);

  &:hover { transform: scale(1.05); }
  &:active { transform: scale(0.95); }
  &:disabled { background: #ccc; box-shadow: none; cursor: default; }

  svg { margin-left: 2px; }
`;

const Header = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  z-index: 10;
  
  h2 {
    font-size: 1rem;
    font-weight: 600;
    color: #444;
    margin: 0;
  }
`;

const ChatArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 80px 20px 100px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
`;

const MessageBubble = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 80%;
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  animation: ${fadeIn} 0.3s ease-out;
`;

const BubbleContent = styled.div`
  padding: 16px 20px;
  border-radius: 20px;
  font-size: 0.95rem;
  line-height: 1.6;
  position: relative;
  word-wrap: break-word;
  
  ${props => props.$isUser ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-bottom-right-radius: 4px;
    box-shadow: 0 4px 12px rgba(118, 75, 162, 0.25);
  ` : `
    background: rgba(255, 255, 255, 0.8);
    color: #333;
    border-bottom-left-radius: 4px;
    border: 1px solid rgba(255,255,255,0.5);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  `}

  p { margin: 0 0 8px 0; &:last-child { margin: 0; } }
  a { color: ${props => props.$isUser ? '#ffd' : '#667eea'}; }
  code { 
    background: ${props => props.$isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'}; 
    padding: 2px 4px; 
    border-radius: 4px; 
    font-family: monospace;
  }
  ul, ol { margin: 8px 0; padding-left: 20px; }
`;

const SourceCard = styled.div`
  margin-top: 10px;
  padding: 12px;
  background: rgba(240, 242, 245, 0.6);
  border-radius: 12px;
  font-size: 0.85rem;
  border: 1px solid rgba(255,255,255,0.4);
  align-self: flex-start;
  width: 100%;

  strong { display: block; margin-bottom: 6px; color: #555; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
  ul { margin: 0; padding-left: 0; list-style: none; }
  li { 
    margin-bottom: 4px; 
    display: flex;
    align-items: center;
    gap: 6px;
    &::before { content: '📄'; font-size: 0.9em; }
  }
`;

const LoadingIndicator = styled.div`
  align-self: flex-start;
  color: #888;
  font-size: 0.9rem;
  margin-left: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::after {
    content: '';
    width: 12px;
    height: 12px;
    border: 2px solid #ccc;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin { to { transform: rotate(360deg); } }
`;

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef();
  const messagesEndRef = useRef();

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const exampleQuestions = [
    "K리그 U22 의무 출전 규정이 뭐야?",
    "KBO 신인 드래프트 참가 자격은?",
    "비디오 판독(VAR) 요청 횟수는?",
    "FA 자격 취득 요건 알려줘"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, hasInteracted]);

  const handleExampleClick = (text) => {
    setInput(text);
    document.getElementById("chat-input")?.focus();
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setLoading(true);
    setHasInteracted(true); 

    setMessages(prev => [...prev, { role: "user", content: userMsg }]);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: userMsg
      });

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.data.answer,
        sources: response.data.sources 
      }]);

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "죄송합니다. 서버 연결에 실패했습니다. 다시 시도해주세요." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GlobalStyle />
      <Background>
        <GlassContainer>
          
          {hasInteracted && (
            <Header>
              <h2>책첵 (Chaek-Check)</h2>
            </Header>
          )}

          {!hasInteracted && (
            <HomeContent $visible={!hasInteracted}>
              <LogoTitle>책첵 (Chaek-Check)</LogoTitle>
              <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '-20px' }}>
                K리그 & KBO 규정집 AI 검색
              </p>
              
              <ExampleGroup>
                {exampleQuestions.map((q, i) => (
                  <ExampleChip key={i} onClick={() => handleExampleClick(q)}>
                    {q}
                  </ExampleChip>
                ))}
              </ExampleGroup>
            </HomeContent>
          )}

          {hasInteracted && (
            <ChatArea>
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} $isUser={msg.role === "user"}>
                  <BubbleContent $isUser={msg.role === "user"}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <SourceCard>
                        <strong>📚 출처</strong>
                        <ul>
                          {msg.sources.map((src, i) => (
                            <li key={i}>
                              {src.file} (p.{src.page})
                            </li>
                          ))}
                        </ul>
                      </SourceCard>
                    )}
                  </BubbleContent>
                </MessageBubble>
              ))}
              
              {loading && <LoadingIndicator>답변 생성 중...</LoadingIndicator>}
              <div ref={messagesEndRef} />
            </ChatArea>
          )}

          <SearchContainer $isChatMode={hasInteracted}>
            <SearchInputWrapper>
              <SearchInput 
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={hasInteracted ? "추가 질문을 입력하세요..." : "규정에 대해 물어보세요..."}
                disabled={loading}
                autoComplete="off"
              />
              <SendButton onClick={sendMessage} disabled={loading}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </SendButton>
            </SearchInputWrapper>
          </SearchContainer>

        </GlassContainer>
      </Background>
    </>
  );
}

export default App;