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
    background: #000;
    overflow: hidden; /* Prevent body scroll */
  }
  
  * {
    box-sizing: border-box;
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0% { transform: translate(0, 0); }
  100% { transform: translate(30px, 50px); }
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
  60% { transform: translateY(-4px); }
`;

const marquee = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

// --- Styled Components (Apple Liquid Glass) ---
const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: radial-gradient(circle at 10% 20%, rgba(216, 241, 230, 0.46) 0%, rgba(233, 226, 226, 0.28) 90.1%),
              radial-gradient(circle at 90% 10%, rgba(176, 218, 255, 1) 0%, rgba(200, 200, 255, 0.2) 90%);
  background-size: 200% 200%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 0;
  overflow: hidden;
  
  &::before, &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.6;
    animation: ${float} 10s infinite ease-in-out alternate;
    z-index: -1;
  }
  
  &::before { width: 400px; height: 400px; background-image: linear-gradient(0deg, #ffdee9 0%, #b5fffc 100%); top: -100px; left: -100px; }
  &::after { width: 300px; height: 300px; background-image: linear-gradient(135deg, #8BC6EC 0%, #9599E2 100%); bottom: -50px; right: -50px; }
`;

const GlassContainer = styled.div`
  width: 100%;
  max-width: 900px;
  height: 100%;
  @media (min-width: 768px) {
    width: 90%;
    height: 90vh;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  }

  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 10;
  padding-top: env(safe-area-inset-top);
`;

// --- Landing Page Specific Components ---
const LandingScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  display: ${props => props.$visible ? 'block' : 'none'};
  
  &::-webkit-scrollbar { width: 0px; } /* 랜딩페이지는 스크롤바 숨김으로 더 깔끔하게 */
`;

const HeroSection = styled.div`
  min-height: 100%; /* 화면 꽉 차게 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  position: relative;
  animation: ${fadeIn} 0.8s ease-out;
`;

const LogoTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #2b2b2b 0%, #555 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 10px 0;
  letter-spacing: -1.5px;
  text-align: center;
  
  @media (max-width: 480px) { font-size: 2.5rem; }
`;

const ScrollHint = styled.div`
  position: absolute;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
  animation: ${bounce} 2s infinite;
  opacity: 0.7;
`;

const DetailsSection = styled.div`
  padding: 60px 20px 80px 20px;
  display: flex;
  flex-direction: column;
  gap: 60px;
  align-items: center;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 800px;
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: transform 0.3s ease;
  
  &:hover { transform: translateY(-5px); background: rgba(255, 255, 255, 0.8); }
  
  h3 { margin: 0 0 10px 0; font-size: 1.1rem; color: #333; display: flex; align-items: center; gap: 8px;}
  p { margin: 0; font-size: 0.9rem; color: #666; line-height: 1.5; }
`;

const MarqueeContainer = styled.div`
  width: 100%;
  overflow: hidden;
  padding: 20px 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4) 10%, rgba(255,255,255,0.4) 90%, transparent);
`;

const MarqueeTrack = styled.div`
  display: inline-flex;
  white-space: nowrap;
  animation: ${marquee} 30s linear infinite;
  gap: 30px;
  padding-right: 30px;
  
  &:hover { animation-play-state: paused; }
`;

const MarqueeItem = styled.div`
  background: rgba(255, 255, 255, 0.9);
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #444;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  border: 1px solid rgba(255,255,255,1);
`;

// --- UI Components ---
const ExampleGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 600px;
  width: 100%;
  margin-top: 30px;
`;

const ExampleChip = styled.button`
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 10px 18px;
  border-radius: 20px;
  font-size: 0.95rem;
  color: #444;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);

  &:hover { background: rgba(255, 255, 255, 1); transform: translateY(-2px); }
  &:active { transform: scale(0.98); }
`;

const SearchContainer = styled.div`
  width: 100%;
  max-width: 600px;
  position: relative;
  transition: all 0.5s ease;
  padding: 0 20px;
  margin-top: 20px;

  ${props => props.$isChatMode && `
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    max-width: 100%;
    padding: 20px;
    padding-bottom: max(20px, env(safe-area-inset-bottom));
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
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  color: #333;
  outline: none;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  transition: all 0.3s;
  
  &::placeholder { color: #999; }
  &:focus { background: #fff; box-shadow: 0 6px 24px rgba(0,0,0,0.1); }
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
  transition: transform 0.2s;
  
  &:hover { transform: scale(1.05); }
  &:disabled { background: #ccc; cursor: default; }
`;

// --- Chat Components ---
const Header = styled.div`
  position: absolute; top: 0; left: 0; right: 0;
  height: calc(60px + env(safe-area-inset-top)); 
  padding-top: env(safe-area-inset-top);
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3); z-index: 10;
  h2 { font-size: 1.1rem; font-weight: 700; color: #333; margin: 0; }
`;

const ChatArea = styled.div`
  flex: 1; overflow-y: auto;
  padding: 80px 20px 100px 20px; 
  display: flex; flex-direction: column; gap: 24px; scroll-behavior: smooth;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
`;

const MessageBubble = styled.div`
  display: flex; flex-direction: column; max-width: 85%;
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  animation: ${fadeIn} 0.3s ease-out;
`;

const BubbleContent = styled.div`
  padding: 14px 18px; border-radius: 20px; font-size: 0.95rem; line-height: 1.6;
  ${props => props.$isUser ? `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
    border-bottom-right-radius: 4px; box-shadow: 0 4px 12px rgba(118, 75, 162, 0.25);
  ` : `
    background: rgba(255, 255, 255, 0.9); color: #333;
    border-bottom-left-radius: 4px; border: 1px solid rgba(255,255,255,0.6);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  `}
  p { margin: 0 0 8px 0; &:last-child { margin: 0; } }
  code { background: ${props => props.$isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'}; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
  ul, ol { margin: 8px 0; padding-left: 20px; }
`;

const SourceCard = styled.div`
  margin-top: 10px; padding: 12px; background: rgba(240, 242, 245, 0.8);
  border-radius: 12px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.6);
  strong { display: block; margin-bottom: 8px; color: #555; }
  ul { margin: 0; padding-left: 0; list-style: none; }
  li { margin-bottom: 6px; }
`;

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef();

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const exampleQuestions = [
    "K리그 U22 의무 출전 규정이 뭐야?",
    "KBO 신인 드래프트 참가 자격은?",
    "샐러리캡 위반 제재금 알려줘",
    "FA 자격 취득 요건은 어떻게 돼?"
  ];

  const marqueeItems = [
    "⚽️ 감독: 이번 경기 경고 누적 선수 확인해줘",
    "🏟️ 팬: K리그 유스 우선 지명 조건이 뭐야?",
    "⚾️ 구단: KBO FA 보상 선수 규정 찾아줘",
    "📝 기자: 샐러리캡 위반 제재금 얼마야?",
    "🏃 선수: B팀 K3 가입 절차가 궁금해"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, hasInteracted]);

  const sendMessage = async (manualText = null) => {
    const textToSend = typeof manualText === 'string' ? manualText : input;
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setInput("");
    setHasInteracted(true); 

    setMessages(prev => [...prev, { role: "user", content: textToSend }]);

    try {
      const response = await axios.post(`${API_URL}/chat`, { message: textToSend });
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.data.answer,
        sources: response.data.sources 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "서버 연결에 실패했습니다." }]);
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
            <Header><h2>책첵 (Chaek-Check)</h2></Header>
          )}

          {/* 랜딩 페이지 모드 (검색 전) */}
          <LandingScrollArea $visible={!hasInteracted}>
            
            {/* 1. Hero Section (화면 꽉 채움) */}
            <HeroSection>
              <LogoTitle>책첵 (Chaek-Check)</LogoTitle>
              <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '20px', textAlign: 'center' }}>
                방대한 스포츠 규정집, 이제 AI에게 바로 물어보세요.
              </p>
              
              <SearchContainer>
                <SearchInputWrapper>
                  <SearchInput 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="예: B팀을 운영하는 최소 조건과 절차가 어떻게 돼?"
                    disabled={loading}
                    autoComplete="off"
                  />
                  <SendButton onClick={() => sendMessage()} disabled={loading}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </SendButton>
                </SearchInputWrapper>
              </SearchContainer>

              <ExampleGroup>
                {exampleQuestions.map((q, i) => (
                  <ExampleChip key={i} onClick={() => sendMessage(q)}>{q}</ExampleChip>
                ))}
              </ExampleGroup>

              <ScrollHint>
                <span>책첵이 궁금하다면?</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </ScrollHint>
            </HeroSection>

            {/* 2. 상세 설명 & Marquee (스크롤 내리면 보임) */}
            <DetailsSection>
              <FeatureGrid>
                <FeatureCard>
                  <h3>🧠 문맥 인식 AI 검색</h3>
                  <p>단순 키워드 검색(Ctrl+F)의 한계를 넘어, 질문의 의도를 파악하고 K리그/KBO 규정집 속 정확한 조항을 찾아냅니다.</p>
                </FeatureCard>
                <FeatureCard>
                  <h3>⚡️ 완벽한 팩트체크</h3>
                  <p>AI의 환각(Hallucination) 현상을 차단하고, 오직 공식 규정 데이터베이스(Pinecone)에 기반한 정확한 답변만 제공합니다.</p>
                </FeatureCard>
                <FeatureCard>
                  <h3>📄 원문 뷰어 즉시 연동</h3>
                  <p>제공된 출처를 클릭하면 원본 PDF 규정집의 해당 페이지로 즉시 이동하여 육안으로 교차 검증이 가능합니다.</p>
                </FeatureCard>
              </FeatureGrid>

              <div style={{ width: '100%', textAlign: 'center' }}>
                <h3 style={{ color: '#444', marginBottom: '20px' }}>누가 책첵을 사용하나요?</h3>
                <MarqueeContainer>
                  <MarqueeTrack>
                    {/* Marquee 효과를 위해 두 번 반복 */}
                    {[...marqueeItems, ...marqueeItems].map((item, i) => (
                      <MarqueeItem key={i}>{item}</MarqueeItem>
                    ))}
                  </MarqueeTrack>
                </MarqueeContainer>
              </div>
            </DetailsSection>

          </LandingScrollArea>

          {/* 채팅 모드 (검색 후) */}
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
                              <a 
                                href={`/pdfs/${src.raw_file}#page=${src.page}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none', color: '#0066cc', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {src.file} (p.{src.page}) <span style={{fontSize: '0.8em'}}>🔍 원문 뷰어 열기</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </SourceCard>
                    )}
                  </BubbleContent>
                </MessageBubble>
              ))}
              
              {loading && <div style={{marginLeft: '10px', color: '#888', fontSize: '0.9rem'}}>답변 생성 중...</div>}
              <div ref={messagesEndRef} />
            </ChatArea>
          )}

          {/* 하단 고정 검색바 (채팅 모드일 때만) */}
          {hasInteracted && (
            <SearchContainer $isChatMode={true}>
              <SearchInputWrapper>
                <SearchInput 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="추가 질문을 입력하세요..."
                  disabled={loading}
                  autoComplete="off"
                />
                <SendButton onClick={() => sendMessage()} disabled={loading}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </SendButton>
              </SearchInputWrapper>
            </SearchContainer>
          )}

        </GlassContainer>
      </Background>
    </>
  );
}

export default App;