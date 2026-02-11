import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import styled, { createGlobalStyle, keyframes, css } from "styled-components";

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
  @keyframes spin { 100% { transform: rotate(360deg); } }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0% { transform: translate(0, 0); }
  100% { transform: translate(30px, 50px); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideUpCentered = keyframes`
  from { opacity: 0; transform: translate(-50%, 40px); }
  to { opacity: 1; transform: translate(-50%, 0); }
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
const pulse = keyframes`
  0% { opacity: 0.5; }
  50% { opacity: 0.2; }
  100% { opacity: 0.5; }
`;

const SkeletonBubble = styled.div`
  display: flex; flex-direction: column; max-width: 85%;
  align-self: flex-start;
  animation: ${fadeIn} 0.3s ease-out;
`;

const SkeletonContent = styled.div`
  padding: 16px 22px; border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  border-bottom-left-radius: 4px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  width: 320px; /* 말풍선 기본 너비 */
`;

const SkeletonLine = styled.div`
  height: 12px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  margin-bottom: 12px;
  width: ${props => props.width || '100%'};
  animation: ${pulse} 1.5s infinite ease-in-out;
`;

const SkeletonSource = styled.div`
  height: 70px;
  background: rgba(240, 245, 250, 0.9);
  border-radius: 12px;
  margin-top: 15px;
  animation: ${pulse} 1.5s infinite ease-in-out;
`;


// --- Styled Components ---
const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: radial-gradient(circle at 10% 20%, rgba(200, 230, 220, 0.8) 0%, rgba(220, 210, 210, 0.6) 90.1%),
              radial-gradient(circle at 90% 10%, rgba(160, 200, 255, 1) 0%, rgba(180, 180, 255, 0.5) 90%);
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
    filter: blur(80px); 
    opacity: 0.5;
    animation: ${float} 15s infinite ease-in-out alternate;
    z-index: -1;
  }
  
  &::before { width: 500px; height: 500px; background-image: linear-gradient(0deg, #ffdee9 0%, #b5fffc 100%); top: -150px; left: -150px; }
  &::after { width: 400px; height: 400px; background-image: linear-gradient(135deg, #8BC6EC 0%, #9599E2 100%); bottom: -100px; right: -100px; }
`;

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
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
  width: 100%;
  
  &::-webkit-scrollbar { width: 0px; }
`;

const ContentWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const HeroSection = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  position: relative;
  animation: ${fadeIn} 0.8s ease-out;

  @media (max-width: 480px) {
    min-height: auto; /* 모바일에선 높이 고정 해제 */
    padding: 100px 20px 40px 20px; /* 상단 여백 확보 */
  }
`;

const LogoTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  color: #222;
  margin: 0 0 10px 0;
  letter-spacing: -1.5px;
  text-align: center;
  text-shadow: 0 2px 10px rgba(255,255,255,0.5);
  
  @media (max-width: 480px) { font-size: 2.5rem; }
`;

const ScrollHint = styled.div`
  position: absolute;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #444; 
  font-size: 0.9rem;
  font-weight: 600;
  animation: ${bounce} 2s infinite;
  opacity: 0.8;
  text-align: center;

  @media (max-width: 480px) {
    position: relative; /* 모바일선 절대위치 해제 */
    bottom: auto;
    margin-top: 50px; /* 예시 질문 버튼과 간격 확보 */
  }
`;

const DetailsSection = styled.div`
  padding: 80px 20px 100px 20px;
  display: flex;
  flex-direction: column;
  gap: 80px;
  align-items: center;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 30px;
  width: 100%;
  max-width: 900px;
`;

const FeatureCard = styled.div`
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 30px;
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.05);
  transition: transform 0.3s ease, background 0.3s ease;
  
  &:hover { 
    transform: translateY(-8px); 
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 12px 40px rgba(0,0,0,0.1);
  }
  
  h3 { margin: 0 0 15px 0; font-size: 1.2rem; color: #222; display: flex; align-items: center; gap: 10px;}
  p { margin: 0; font-size: 1rem; color: #555; line-height: 1.6; }
`;

const MarqueeContainer = styled.div`
  width: 100vw;              
  position: relative;
  left: 50%;
  transform: translateX(-50%); 
  overflow: hidden;
  padding: 30px 0;
  background: rgba(255, 255, 255, 0.1); 
`;
const MarqueeTrack = styled.div`
  display: inline-flex;
  white-space: nowrap;
  animation: ${marquee} 40s linear infinite;
  gap: 40px;
  padding-right: 40px;
  
  &:hover { animation-play-state: paused; }
`;

const MarqueeItem = styled.div`
  background: rgba(255, 255, 255, 0.95);
  padding: 16px 32px;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
`;

const LogoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0;
  justify-content: center;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const GridInfoText = styled.p`
  font-size: 0.9rem;
  color: #666;
  margin-top: 30px; /* 10px에서 30px로 상향 */
  text-align: center;
  line-height: 1.6;
  padding: 0 10px;

  @media (max-width: 480px) {
    margin-top: 40px; /* 모바일에서 더 띄움 */
  }
`;

const InstitutionLogo = styled.a`
  display: flex;
  justify-content: center;
  align-items: center;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  padding: 20px;
  aspect-ratio: 1 / 1;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  
  filter: ${props => props.$active ? 'grayscale(0%)' : 'grayscale(100%) opacity(0.5)'};
  cursor: ${props => props.$active ? 'pointer' : 'default'};
  pointer-events: ${props => props.$active ? 'auto' : 'none'};

  &:hover {
    transform: ${props => props.$active ? 'translateY(-5px)' : 'none'};
    background: ${props => props.$active ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)'};
    box-shadow: ${props => props.$active ? '0 10px 25px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.05)'};
    filter: ${props => props.$active ? 'grayscale(0%)' : 'grayscale(100%) opacity(0.5)'};
  }

  img {
    width: 80%;
    height: 80%;
    object-fit: contain;
  }
`;

const FooterContainer = styled.footer`
  width: 100%;
  padding: 40px 20px;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: auto;
`;

const FooterText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  text-align: center;
`;

const FooterLinks = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const FooterLink = styled.a`
  color: #555;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    color: #4A90E2;
    text-decoration: underline;
  }
`;

// --- UI Components ---
const ExampleGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 700px;
  width: 100%;
  margin-top: 40px;

  @media (max-width: 480px) {
    gap: 8px; /* 간격을 좁혀서 더 많이 들어가게 함 */
    margin-top: 25px;
    
    button {
      font-size: 0.85rem; /* 글자 크기 살짝 축소 */
      padding: 10px 18px;
      width: 100%; /* 모바일에서 버튼을 한 줄씩 꽉 차게 하고 싶다면 활성화 */
    }
  }
`;

const ExampleChip = styled.button`
  background: rgba(255, 255, 255, 0.8);
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);

  &:hover { background: rgba(255, 255, 255, 1); transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
  &:active { transform: scale(0.98); }
`;

const SearchContainer = styled.div`
  width: 100%;
  max-width: 700px;
  position: relative;
  transition: all 0.5s ease;
  padding: 0 20px;
  margin-top: 30px; /* 랜딩 페이지일 때의 여백 */
  align-self: center;

  ${props => props.$isChatMode && css`
    position: absolute;
    /* 🔥 바닥에서 딱 24px만 띄우기 (가장 안정감 있는 여백) */
    bottom: max(12px, env(safe-area-inset-bottom)); 
    
    /* 🔥 랜딩 페이지에서 쓰던 margin을 강제로 0으로 초기화해서 간섭 제거! */
    margin: 0; 
    
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 700px;
    padding: 0 20px;
    
    background: transparent !important;
    backdrop-filter: none !important;
    border: none !important;
    box-shadow: none !important;
    z-index: 20;

    animation: ${slideUpCentered} 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
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
  padding: 20px 60px 20px 30px;
  border-radius: 50px;
  /* 🔥 하얀색 얇은 테두리를 줘서 배경과 깔끔하게 분리 */
  border: 1px solid rgba(255, 255, 255, 0.5); 
  /* 🔥 배경을 살짝 더 투명하게 해서 뒤쪽 그라데이션이 예쁘게 비치도록 */
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px); 
  font-size: 1.1rem;
  color: #333;
  outline: none;
  
  /* 🔥 범인이었던 칙칙하고 넓은 그림자를 아주 맑고 좁게 줄임! */
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02); 
  transition: all 0.3s ease;
  
  &::placeholder { color: #888; }
  &:focus { 
    background: rgba(255, 255, 255, 0.95); 
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.05); 
    border-color: rgba(255, 255, 255, 0.8);
  }
`;

const SendButton = styled.button`
  position: absolute;
  right: 8px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4A90E2 0%, #9013FE 100%); 
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(74, 144, 226, 0.4);
  
  svg {
    width: 24px;
    height: 24px;
    stroke-width: 2; /* 선 굵기를 3->2로 낮춰서 뭉개짐(점 현상) 방지 */
    flex-shrink: 0;
  }

  &:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(74, 144, 226, 0.6); }
  &:disabled { background: #ccc; cursor: default; box-shadow: none; }
`;

const SideButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  flex-shrink: 0;

  svg {
    width: 24px;
    height: 24px;
    stroke-width: 2;
    flex-shrink: 0;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    color: #333;
  }
`;

// --- Chat Components ---
const Header = styled.div`
  position: absolute; top: 0; left: 0; right: 0;
  height: calc(70px + env(safe-area-inset-top)); 
  padding-top: env(safe-area-inset-top);
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  z-index: 30;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  h2 { font-size: 1.2rem; font-weight: 800; color: #333; margin: 0; }
`;

const ChatArea = styled.div`
  flex: 1; overflow-y: auto;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  /* 🔥 하단 여백을 150px로 넉넉하게 주어 마지막 메시지가 완전히 위로 올라오게 함! */
  padding: 160px 20px 150px 20px; 
  display: flex; flex-direction: column; gap: 24px; scroll-behavior: smooth;
  
  /* 🔥 핵심 마법: 하단 15% 구간에서 텍스트가 투명하게 스르륵 사라지게 만듦 (페이드아웃) */
  -webkit-mask-image: linear-gradient(to bottom, black 85%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 85%, transparent 100%);

  animation: ${slideUp} 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
`;

const MessageBubble = styled.div`
  display: flex; flex-direction: column; max-width: 85%;
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  animation: ${fadeIn} 0.3s ease-out;
`;

const BubbleContent = styled.div`
  padding: 16px 22px; border-radius: 24px; font-size: 1rem; line-height: 1.6;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  ${props => props.$isUser ? `
    background: linear-gradient(135deg, #4A90E2 0%, #9013FE 100%); color: white;
    border-bottom-right-radius: 4px;
    box-shadow: 0 8px 24px rgba(74, 144, 226, 0.3);
  ` : `
    background: rgba(255, 255, 255, 0.95); color: #333;
    border-bottom-left-radius: 4px;
  `}
  p { margin: 0 0 10px 0; &:last-child { margin: 0; } }
  code { background: ${props => props.$isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'}; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
  ul, ol { margin: 10px 0; padding-left: 20px; }
  strong { font-weight: 700; }
`;

const SourceCard = styled.div`
  margin-top: 12px; padding: 16px; background: rgba(240, 245, 250, 0.9);
  border-radius: 16px; font-size: 0.9rem;
  align-self: flex-start; width: 100%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);

  strong { display: block; margin-bottom: 10px; color: #4A90E2; font-weight: 700; }
  ul { margin: 0; padding-left: 0; list-style: none; }
  li { margin-bottom: 8px; &:last-child { margin-bottom: 0; } }
`;

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [loadingText, setLoadingText] = useState("📚 관련 규정을 탐색할 준비 중...");
  const messagesEndRef = useRef();

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const exampleQuestions = [
    "K리그에서 유니폼 색상 관련 규정은?",
    "K리그 클럽 라이센스 조건은?",
    "KBO 경기 사용구 규정",
    "KBO FA 자격 취득 요건은 어떻게 돼?"
  ];

  const marqueeItems = [
    "⚽️ 감독: 이번 경기 경고 누적 선수 확인해줘",
    "🏟️ 팬: K리그 유스 우선 지명 조건이 뭐야?",
    "⚾️ 구단: KBO FA 보상 선수 규정 찾아줘",
    "📝 기자: 샐러리캡 위반 제재금 얼마야?",
    "🏃 선수: B팀 K3 가입 절차가 궁금해"
  ];

  const institutions = [
    { name: "KBO", file: "kbo.svg", url: "https://www.koreabaseball.com/Kbo/Board/Ebook/EbookPublication.aspx", active: true },
    { name: "K League", file: "kleague.png", url: "https://www.kleague.com/about/regulations.do", active: true },
    { name: "KFA", file: "kfa.png", url: "", active: false },
    { name: "AFC", file: "afc.svg", url: "", active: false },
    { name: "FIFA", file: "fifa.png", url: "", active: false },
    { name: "IFAB", file: "ifab.png", url: "", active: false },
    { name: "KBL", file: "kbl.svg", url: "", active: false },
    { name: "LCK", file: "lck.svg", url: "", active: false },
    { name: "MLB", file: "mlb.png", url: "", active: false },
    { name: "UEFA", file: "uefa.png", url: "", active: false },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, hasInteracted]);

  useEffect(() => {
    let interval;
    if (loading) {
      const loadingMessages = [
        "📚 관련 규정을 Pinecone DB에서 찾는 중...",
        "🔍 여러 규정집을 꼼꼼히 읽어보는 중...",
        "✍️ 사용자님을 위한 답변을 정리하고 있습니다!",
        "✨ 거의 다 왔습니다! 최종 검토 중..."
      ];
      let msgIndex = 0;
      setLoadingText(loadingMessages[0]); // 처음 시작할 때 1번 메시지 띄우기
      
      interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % loadingMessages.length;
        setLoadingText(loadingMessages[msgIndex]);
      }, 1500); // 1.5초마다 메시지 변경!
    }
    return () => clearInterval(interval);
  }, [loading]);

  const sendMessage = async (manualText = null) => {
    const textToSend = typeof manualText === 'string' ? manualText : input;
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setInput("");
    setHasInteracted(true); 

    setMessages(prev => [...prev, { role: "user", content: textToSend }]);

    // 🚨 [추가된 로직] 비용 절감: 단순 인사/종결어는 프론트엔드에서 바로 답변 쳐내기!
    const cleanText = textToSend.replace(/[\s~!?.,]/g, "").toLowerCase();
    
    // 고마/교마/고맙, 감사/감쟈, ㅇㅋ/ok/오키, 아하/그렇구나 등 핵심 패턴을 모두 그물망처럼 잡습니다.
    const endingRegex = /고마[워왑맙]|고맙|교마워|감사|감쟈|ㄱㅅ|땡큐|thank|알겠|알았|ㅇㅋ|오케이|오키|ok|굿|좋아|그렇구나|아하|이해했/i;
    
    const isEnding = endingRegex.test(cleanText);

    if (isEnding) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "도움이 되셨다니 다행입니다! ☺️ 더 궁금한 K리그나 KBO 규정이 있다면 언제든 편하게 물어보세요.",
          sources: [] 
        }]);
        setLoading(false);
      }, 800);
      return; // 서버 통신 완벽 차단!
    }

    try {
      const response = await axios.post(`${API_URL}/chat`, { message: textToSend });
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.data.answer,
        sources: response.data.sources,
        generationTime: response.data.generation_time // 🟢 백엔드에서 준 시간 저장!
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "서버 연결에 실패했습니다." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    window.location.reload();
  };

  const handleSave = () => {
    const content = messages.map(m => `### ${m.role === 'user' ? '질문' : '답변'}\n${m.content}\n`).join('\n---\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chaek-check-chat.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <GlobalStyle />
      <Background>
        {/* 🔥 수정됨: GlassContainer -> MainContainer */}
        <MainContainer>
          
          {hasInteracted && (
            <Header><h2>책첵 (Chaek-Check)</h2></Header>
          )}

          {/* 랜딩 페이지 모드 (검색 전) */}
          <LandingScrollArea $visible={!hasInteracted}>
            {/* 콘텐츠가 너무 퍼지지 않게 감싸는 래퍼 */}
            <ContentWrapper>
              {/* 1. Hero Section */}
              <HeroSection>
                <LogoTitle>책첵 (Chaek-Check)</LogoTitle>
                <p style={{ color: '#444', fontSize: '1.2rem', marginBottom: '30px', textAlign: 'center', fontWeight: 500 }}>
                  방대한 스포츠 규정집, AI에게 바로 물어보세요.
                </p>
                
                <SearchContainer>
                  <SearchInputWrapper>
                    <SearchInput 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="예: K리그팀 운영하는 최소 조건과 절차가 어떻게 돼?"
                      disabled={loading}
                      autoComplete="off"
                    />
                    <SendButton onClick={() => sendMessage()} disabled={loading}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
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
                  <span>질문 전,<br></br>'책첵' 서비스가 궁금하다면?</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </ScrollHint>
              </HeroSection>

              {/* 2. 상세 설명 & Marquee (스크롤 내리면 보임) */}
              <DetailsSection>
                <h3 style={{ color: '#222', fontSize: '1.8rem', fontWeight: 800, marginBottom: '-20px' }}>Why Chaek-Check?</h3>
                <FeatureGrid>
                  <FeatureCard>
                    <h3>🧠 문맥 인식 AI 검색</h3>
                    <p>단순 키워드 검색의 한계를 넘어, 질문의 의도를 파악하고 방대한 규정집 속에서 정확한 조항을 찾아냅니다.</p>
                  </FeatureCard>
                  <FeatureCard>
                    <h3>⚡️ 완벽한 팩트체크 (RAG)</h3>
                    <p>AI의 환각 현상을 차단하고, 오직 공식 규정 데이터베이스에 기반한 신뢰할 수 있는 답변만 제공합니다.</p>
                  </FeatureCard>
                  <FeatureCard>
                    <h3>📄 원문 뷰어 즉시 연동</h3>
                    <p>제공된 출처를 클릭하면 PDF 규정집의 해당 페이지가 즉시 열려 육안으로 교차 검증이 가능합니다.</p>
                  </FeatureCard>
                </FeatureGrid>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <h3 style={{ color: '#222', fontSize: '1.5rem', fontWeight: 700 }}>규정 반영된 기관</h3>
                  <LogoGrid>
                    {institutions.map((inst, i) => (
                      <InstitutionLogo 
                        key={i} 
                        href={inst.active ? inst.url : undefined} 
                        target={inst.active ? "_blank" : undefined}
                        rel={inst.active ? "noopener noreferrer" : undefined}
                        $active={inst.active}
                        title={inst.name}
                      >
                         <img src={`/assets/logos/${inst.file}`} alt={inst.name} />
                      </InstitutionLogo>
                    ))}
                  </LogoGrid>
                  <GridInfoText>
                    해당 기관을 클릭하면 규정을 바로 확인할 수 있습니다.<br />
                    등록되지 않은 기관의 규정은 점차 업데이트될 예정입니다.
                  </GridInfoText>
                </div>

                <div style={{ width: '100%', textAlign: 'center', marginTop: '40px' }}>
                  <h3 style={{ color: '#222', fontSize: '1.5rem', marginBottom: '20px', fontWeight: 700 }}>활용 예시</h3>
                  <MarqueeContainer>
                    <MarqueeTrack>
                      {[...marqueeItems, ...marqueeItems].map((item, i) => (
                        <MarqueeItem key={i}>{item}</MarqueeItem>
                      ))}
                    </MarqueeTrack>
                  </MarqueeContainer>
                </div>
              </DetailsSection>
              
              <FooterContainer>
                <FooterLinks>
                  <FooterLink href="https://github.com/lee-chh/chaek-check" target="_blank" rel="noopener noreferrer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                    GitHub
                  </FooterLink>
                  <FooterLink href="tjdnftks12@naver.com">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    Contact
                  </FooterLink>
                </FooterLinks>
                <FooterText>© {new Date().getFullYear()} Chaek-Check. All rights reserved.</FooterText>
              </FooterContainer>

            </ContentWrapper>
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
                        <strong>📚 규정 근거 & 원문 보기</strong>
                        <ul>
                          {msg.sources.map((src, i) => (
                            <li key={i}>
                              <a 
                                href={`/pdfs/${src.raw_file}#page=${src.page}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  textDecoration: 'none', 
                                  color: '#4A90E2', // 링크 색상 변경
                                  fontWeight: '600', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px'
                                }}
                              >
                                <span style={{fontSize: '1.2em'}}>📄</span> {src.file} (p.{src.page}) 
                                <span style={{fontSize: '0.85em', background: 'rgba(74, 144, 226, 0.1)', padding: '2px 6px', borderRadius: '4px'}}>🔍 뷰어 열기</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </SourceCard>
                    )}
                    {msg.generationTime && (
                      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#888', marginTop: '10px', fontFamily: 'monospace' }}>
                        ⏱️ 응답 소요 시간: {msg.generationTime}초
                      </div>
                    )}
                  </BubbleContent>
                </MessageBubble>
              ))}
              
              {/* 예쁜 스켈레톤 로딩 UI */}
              {loading && (
                <SkeletonBubble>
                  <SkeletonContent>
                    {/* 1.5초마다 바뀌는 재치 있는 로딩 메시지 */}
                    <div style={{ color: '#4A90E2', fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', animation: 'spin 2s linear infinite' }}>⏳</span> 
                      {loadingText}
                    </div>
                    {/* 깜빡거리는 가짜 텍스트 줄 */}
                    <SkeletonLine width="90%" />
                    <SkeletonLine width="70%" />
                    <SkeletonLine width="85%" />
                    {/* 깜빡거리는 가짜 출처 카드 */}
                    <SkeletonSource />
                  </SkeletonContent>
                </SkeletonBubble>
              )}
              <div ref={messagesEndRef} />
            </ChatArea>
          )}

          {/* 하단 고정 검색바 (채팅 모드일 때만) */}
          {hasInteracted && (
            <SearchContainer $isChatMode={true}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <SideButton onClick={handleSave} title="대화 저장">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </SideButton>

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
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </SendButton>
                </SearchInputWrapper>

                <SideButton onClick={handleReset} title="홈으로">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </SideButton>
              </div>
            </SearchContainer>
          )}

        </MainContainer>
      </Background>
    </>
  );
}

export default App;