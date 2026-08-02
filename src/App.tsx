import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Volume2, VolumeX, Eraser, Terminal, Brain, Zap, Wand2, RefreshCw } from 'lucide-react';
import { SVGCharacter } from './components/SVGCharacter';
import { Message, ChatMode } from './types';

const INITIAL_MESSAGE = "SYSTEM BOOT... CYBER-GRIMOIRE ONLINE. What do you want, meatbag? I mean... Greetings, user! Need me to decrypt some arcane knowledge or render a holographic spell projection? Ask me anything, or type a prompt to *draw* a projection!";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("normal");
  const [displayedText, setDisplayedText] = useState(INITIAL_MESSAGE);
  const [drawingImage, setDrawingImage] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const synth = window.speechSynthesis;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedText, drawingImage]);

  const speak = (text: string) => {
    if (!isVoiceEnabled) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.pitch = 0.5; // Robotic/deep pitch
    utterance.rate = 1.1; // Slightly faster
    synth.speak(utterance);
  };

  const toggleVoice = () => {
    if (isVoiceEnabled) synth.cancel();
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const clearChat = () => {
    setMessages([]);
    setDisplayedText(INITIAL_MESSAGE);
    setDrawingImage(null);
    synth.cancel();
  };

  const createCyberNodes = (e: React.MouseEvent) => {
    const node = document.createElement('div');
    node.className = 'cyber-node';
    node.textContent = Math.random() > 0.5 ? '0' : '1';
    node.style.left = e.clientX + 'px';
    node.style.top = e.clientY + 'px';
    document.body.appendChild(node);

    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.random() * 50;
    const tx = Math.cos(angle) * radius;
    const ty = Math.sin(angle) * radius;

    node.animate([
      { opacity: 1, transform: 'translate(0, 0) scale(1)' },
      { opacity: 0, transform: `translate(${tx}px, ${ty}px) scale(0.5)` }
    ], {
      duration: 800 + Math.random() * 600,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    }).onfinish = () => node.remove();
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    setInputText("");
    
    const isImageRequest = /draw|show me|picture of|paint/i.test(userText);
    
    const newMessages: Message[] = [...messages, { role: "user", parts: [{ text: userText }] }];
    setMessages(newMessages);
    setIsTyping(true);
    setDisplayedText("");
    setDrawingImage(null);

    try {
      if (isImageRequest) {
        setDisplayedText("> EXECUTING HOLOGRAPHIC RENDER PROTOCOL...");
        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userText })
        });
        const data = await res.json();
        
        if (data.imageBase64) {
          setDrawingImage(`data:image/jpeg;base64,${data.imageBase64}`);
          const msg = "Render complete. Behold the holographic projection! Pretty good for a digital book, right?";
          setDisplayedText(msg);
          speak(msg);
          setMessages([...newMessages, { role: "model", parts: [{ text: msg }] }]);
        } else {
          setDisplayedText("> ERROR: GPU OVERLOAD. HOLOGRAPH MATRIX FAILED.");
        }
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, mode: chatMode })
        });
        
        const data = await res.json();
        const replyText = data.text || "> CRITICAL ERROR. CONNECTION LOST.";
        
        setMessages([...newMessages, { role: "model", parts: [{ text: replyText }] }]);
        
        let index = 0;
        setDisplayedText("");
        
        const typeInterval = setInterval(() => {
          setDisplayedText((prev) => prev + replyText.charAt(index));
          index++;
          if (index >= replyText.length) {
            clearInterval(typeInterval);
            setIsTyping(false);
          }
        }, 12); 
        
        speak(replyText);
        return; 
      }
    } catch (e) {
      setDisplayedText("> SYSTEM EXCEPTION: FIREWALL BLOCKED THE CONNECTION.");
    }
    
    setIsTyping(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8" onClick={createCyberNodes}>
      <div className="cyber-shadow flex flex-col md:flex-row bg-[#090910]/90 backdrop-blur-md rounded-xl p-2 relative">
        <div className="cyber-spine hidden md:block absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 z-10 pointer-events-none" />
        
        {/* Left Panel */}
        <div className="page-texture flex-1 min-h-[60vh] p-8 flex flex-col items-center justify-center rounded-t-lg md:rounded-l-lg md:rounded-tr-none border-b md:border-b-0 md:border-r border-[var(--panel-border)]">
          <h1 className="font-display font-black tracking-widest text-4xl md:text-5xl text-[var(--ink-color)] mb-1 drop-shadow-[0_0_15px_rgba(0,240,255,0.8)] text-center">
            IGNIS <span className="text-[var(--accent-color)]">//</span> OS
          </h1>
          <h2 className="font-mono text-xs text-[var(--accent-color)] uppercase tracking-[0.3em] mb-10 text-center animate-pulse">
            CYBER-GRIMOIRE v2.0.4
          </h2>
          
          <SVGCharacter isTalking={isTyping} />
          
          <p className="text-center text-[var(--ink-color)]/70 font-mono text-sm mb-8 max-w-xs mt-4">
            [STATUS: ONLINE]<br/>
            Awaiting input sequence...
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <button 
              onClick={toggleVoice}
              className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all border ${isVoiceEnabled ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)] border-[var(--accent-color)] shadow-[0_0_10px_rgba(255,0,85,0.4)]' : 'bg-transparent text-[var(--ink-color)]/50 border-[var(--ink-color)]/20 hover:bg-[var(--ink-color)]/10 hover:text-[var(--ink-color)]'}`}
            >
              {isVoiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              Voice Output
            </button>
            <button 
              onClick={clearChat}
              className="flex items-center gap-2 px-4 py-2 rounded font-mono text-xs uppercase tracking-wider bg-transparent text-[var(--ink-color)]/50 border border-[var(--ink-color)]/20 hover:bg-[var(--ink-color)]/10 hover:text-[var(--ink-color)] transition-all"
            >
              <Eraser size={14} />
              Purge Logs
            </button>
          </div>

          <div className="flex gap-2 p-1 bg-black/40 rounded border border-[var(--panel-border)]">
            <button 
              onClick={() => setChatMode("fast")}
              title="Flash Node (Fast)"
              className={`p-2 rounded transition-colors ${chatMode === 'fast' ? 'bg-[var(--ink-color)]/20 shadow-[0_0_8px_rgba(0,240,255,0.5)] text-[var(--ink-color)]' : 'text-[var(--ink-color)]/30 hover:text-[var(--ink-color)]'}`}
            >
              <Zap size={16} />
            </button>
            <button 
              onClick={() => setChatMode("normal")}
              title="Standard Protocol"
              className={`p-2 rounded transition-colors ${chatMode === 'normal' ? 'bg-[var(--ink-color)]/20 shadow-[0_0_8px_rgba(0,240,255,0.5)] text-[var(--ink-color)]' : 'text-[var(--ink-color)]/30 hover:text-[var(--ink-color)]'}`}
            >
              <Wand2 size={16} />
            </button>
            <button 
              onClick={() => setChatMode("deep")}
              title="Deep Thought Node"
              className={`p-2 rounded transition-colors ${chatMode === 'deep' ? 'bg-[var(--ink-color)]/20 shadow-[0_0_8px_rgba(0,240,255,0.5)] text-[var(--ink-color)]' : 'text-[var(--ink-color)]/30 hover:text-[var(--ink-color)]'}`}
            >
              <Brain size={16} />
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="page-texture flex-1 min-h-[60vh] p-6 flex flex-col rounded-b-lg md:rounded-r-lg md:rounded-bl-none">
          <div className="flex-1 overflow-y-auto chat-scrollbar pr-4 mb-4 font-sans text-[var(--ink-color)]/90 text-sm md:text-base leading-relaxed">
            
            <div className="space-y-8">
              {messages.filter(m => m.role === 'user').map((msg, i) => (
                <div key={i} className="text-right font-mono text-[var(--accent-color)] border-r-2 border-[var(--accent-color)] pr-3">
                  <span className="opacity-50 text-xs mr-2">{'>'}</span> 
                  {msg.parts[0].text}
                </div>
              ))}
              
              <div className={`markdown-body transition-opacity duration-300 ${isTyping ? 'opacity-90 typing-cursor' : 'opacity-100'}`}>
                <Markdown>{displayedText}</Markdown>
                
                {drawingImage && (
                  <div className="mt-4 p-1 border border-[var(--accent-color)]/50 shadow-[0_0_15px_rgba(255,0,85,0.3)] bg-black/50 rounded animate-in fade-in zoom-in duration-500">
                    <img src={drawingImage} alt="Holographic render" className="w-full h-auto opacity-90 mix-blend-screen" />
                  </div>
                )}
              </div>
            </div>
            
            <div ref={chatEndRef} className="h-4" />
          </div>

          <div className="flex gap-3 pt-4 border-t border-dashed border-[var(--panel-border)] font-mono mt-auto relative">
            <Terminal size={18} className="absolute left-3 top-7 text-[var(--accent-color)]" />
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter command sequence..."
              className="flex-1 bg-black/50 border border-[var(--panel-border)] rounded px-10 py-3 text-sm focus:outline-none focus:border-[var(--ink-color)] focus:shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all placeholder:text-[var(--ink-color)]/30 text-[var(--ink-color)]"
              disabled={isTyping}
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || !inputText.trim()}
              className="w-12 h-12 flex items-center justify-center rounded bg-[var(--accent-color)] text-[#05050a] hover:bg-white hover:text-[var(--accent-color)] hover:shadow-[0_0_15px_rgba(255,0,85,0.6)] disabled:opacity-30 disabled:hover:bg-[var(--accent-color)] disabled:hover:text-[#05050a] disabled:shadow-none transition-all"
            >
              {isTyping ? <RefreshCw size={18} className="animate-spin" /> : <Terminal size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

