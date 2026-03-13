import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, ChevronDown, MessageCircle, Loader2 } from "lucide-react";
import { useApiBase } from "@/hooks/use-api-base";
import { useAuth } from "@workspace/replit-auth-web";

const BASE = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
    || (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    : null;

interface Message {
  role: "user" | "apphia";
  content: string;
}

async function speakWithBrowser(text: string, onStart?: () => void, onEnd?: () => void) {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();

  const utt = new SpeechSynthesisUtterance(text);

  const voices = window.speechSynthesis?.getVoices() || [];
  const preferred =
    voices.find(v => v.lang === "en-US" && /samantha|zira|karen|victoria|fiona|moira|veena/i.test(v.name))
    || voices.find(v => v.lang === "en-US" && v.name.includes("Google") && v.name.includes("Female"))
    || voices.find(v => v.lang === "en-US" && v.name.includes("Google"))
    || voices.find(v => v.lang.startsWith("en-") && !v.name.toLowerCase().includes("male"))
    || voices.find(v => v.lang.startsWith("en"))
    || voices[0];

  if (preferred) utt.voice = preferred;
  utt.rate = 1.05;
  utt.pitch = 1.05;
  utt.volume = 0.95;

  if (onStart) { utt.onstart = onStart; }
  if (onEnd)   { utt.onend = onEnd; utt.onerror = onEnd; }

  window.speechSynthesis?.speak(utt);
}

export function VoiceCompanion() {
  const apiBase  = useApiBase();
  const { user, isAuthenticated } = useAuth();

  const [isOpen,      setIsOpen]      = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isMuted,     setIsMuted]     = useState(false);
  const [isSending,   setIsSending]   = useState(false);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [inputText,   setInputText]   = useState("");
  const [orbPulse,    setOrbPulse]    = useState(false);

  const recogRef   = useRef<SpeechRecognition | null>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return;
    const msg = text.trim();
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInputText("");
    setIsSending(true);
    setOrbPulse(true);
    try {
      const res = await fetch(`${apiBase}/api/apphia/voice-message`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      const reply = data.reply || "I'm here. How can I assist you?";
      setMessages(prev => [...prev, { role: "apphia", content: reply }]);
      if (!isMuted) {
        await speakWithBrowser(
          reply,
          () => setIsSpeaking(true),
          () => { setIsSpeaking(false); setOrbPulse(false); }
        );
      } else {
        setOrbPulse(false);
      }
    } catch {
      setMessages(prev => [...prev, { role: "apphia", content: "I'm having trouble connecting right now." }]);
      setOrbPulse(false);
    } finally {
      setIsSending(false);
    }
  }, [apiBase, isSending, isMuted]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI || isMuted) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog = new SpeechRecognitionAPI() as any;
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.continuous = false;

    recog.onstart  = () => { setIsListening(true); setOrbPulse(true); };
    recog.onend    = () => { setIsListening(false); };
    recog.onerror  = () => { setIsListening(false); setOrbPulse(false); };
    recog.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const spoken = e.results[0]?.[0]?.transcript?.trim();
      if (spoken) void sendMessage(spoken);
    };

    recogRef.current = recog;
    recog.start();
  }, [isMuted, sendMessage]);

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    setIsListening(false);
    setOrbPulse(false);
  }, []);

  const handleMicClick = () => {
    if (isListening) { stopListening(); return; }
    if (!isOpen) setIsOpen(true);
    startListening();
  };

  if (!isAuthenticated) return null;

  const greetName = user?.firstName ? `, ${user.firstName}` : "";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/40 w-80 sm:w-96 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/30">
                  <img src={`${BASE}/images/logo-pmo-ops.png`} alt="Apphia" className="w-full h-full object-cover" />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-emerald-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-none">Apphia</p>
                <p className="text-blue-200 text-[11px] mt-0.5">
                  {isSpeaking ? "Speaking..." : isListening ? "Listening..." : isSending ? "Thinking..." : "Ready to assist"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsMuted(m => !m)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all">
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden ring-4 ring-blue-100 shadow-md">
                    <img src={`${BASE}/images/logo-pmo-ops.png`} alt="Apphia" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Hi{greetName}! I'm Apphia.</p>
                    <p className="text-xs text-slate-500 mt-1">Ask me anything about your systems, or tap the mic to speak.</p>
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {m.role === "apphia" && (
                    <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0 mt-0.5">
                      <img src={`${BASE}/images/logo-pmo-ops.png`} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm shadow-sm"
                      : "bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0">
                    <img src={`${BASE}/images/logo-pmo-ops.png`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 p-3 border-t border-slate-100 bg-white">
              <button onClick={handleMicClick}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  isListening
                    ? "bg-red-500 text-white shadow-md shadow-red-200 animate-pulse"
                    : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                }`}>
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(inputText); } }}
                placeholder="Ask Apphia anything..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                onClick={() => void sendMessage(inputText)}
                disabled={!inputText.trim() || isSending}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 disabled:opacity-40 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-sm">
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating orb button */}
      <motion.button
        onClick={() => { setIsOpen(o => !o); if (!isOpen) setTimeout(() => inputRef.current?.focus(), 300); }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-14 h-14 rounded-full shadow-2xl shadow-blue-300/50 overflow-hidden group"
      >
        {/* Animated ring when active */}
        {(isListening || isSpeaking || orbPulse) && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-blue-400/60"
            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-white shadow-inner">
          <img
            src={`${BASE}/images/logo-pmo-ops.png`}
            alt="Apphia Voice"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
          />
        </div>
        {isOpen && (
          <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
        )}
      </motion.button>
    </div>
  );
}

function ArrowUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
    </svg>
  );
}
