import { useState, useRef, useEffect, useCallback } from "react";
import { Card, Button } from "@/components/ui";
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApiBase } from "@/hooks/use-api-base";

interface VoiceMessage {
  role: "user" | "apphia";
  content: string;
  timestamp: Date;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function VoicePanel() {
  const apiBase = useApiBase();
  const [isConnected, setIsConnected]   = useState(false);
  const [isMuted, setIsMuted]           = useState(false);
  const [isSpeakerOn, setIsSpeakerOn]   = useState(true);
  const [isListening, setIsListening]   = useState(false);
  const [isSending, setIsSending]       = useState(false);
  const [transcript, setTranscript]     = useState<VoiceMessage[]>([]);
  const [srSupported]                   = useState(!!SpeechRecognitionAPI);
  const [error, setError]               = useState<string | null>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const recogRef    = useRef<SpeechRecognition | null>(null);
  const synthRef    = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  const speak = useCallback((text: string) => {
    if (!isSpeakerOn || typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    const voices = window.speechSynthesis?.getVoices() || [];
    const preferred = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
      || voices.find(v => v.lang.startsWith("en"))
      || voices[0];
    if (preferred) utt.voice = preferred;
    synthRef.current = utt;
    window.speechSynthesis?.speak(utt);
  }, [isSpeakerOn]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    setError(null);

    setTranscript(prev => [...prev, { role: "user", content: text, timestamp: new Date() }]);

    try {
      const res = await fetch(`${apiBase}/api/apphia/voice-message`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json() as { response: string };
      const reply = data.response || "I didn't get a response.";
      setTranscript(prev => [...prev, { role: "apphia", content: reply, timestamp: new Date() }]);
      speak(reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection error";
      setError(msg);
      setTranscript(prev => [...prev, { role: "apphia", content: `Connection issue: ${msg}`, timestamp: new Date() }]);
    } finally {
      setIsSending(false);
    }
  }, [apiBase, isSending, speak]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI || isMuted) return;
    const recog = new SpeechRecognitionAPI();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.continuous = false;

    recog.onstart  = () => setIsListening(true);
    recog.onend    = () => setIsListening(false);
    recog.onerror  = (e) => { setIsListening(false); setError(`Speech error: ${e.error}`); };
    recog.onresult = (e) => {
      const spoken = e.results[0]?.[0]?.transcript?.trim();
      if (spoken) void sendMessage(spoken);
    };

    recogRef.current = recog;
    recog.start();
  }, [isMuted, sendMessage]);

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleListening = () => {
    if (!isConnected) return;
    if (isListening) { stopListening(); } else { startListening(); }
  };

  const startSession = () => {
    setIsConnected(true);
    setError(null);
    const greeting = "Voice companion active. I'm Apphia, ready to assist with diagnostics, system monitoring, and operational guidance. How can I help?";
    setTranscript([{ role: "apphia", content: greeting, timestamp: new Date() }]);
    speak(greeting);
  };

  const endSession = () => {
    stopListening();
    window.speechSynthesis?.cancel();
    setIsConnected(false);
    setIsListening(false);
  };

  const QUICK_COMMANDS = [
    "Check system status",
    "Run a diagnostic",
    "Show recent alerts",
    "Connector health report",
    "List open cases",
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white text-glow">Voice Companion</h1>
        <p className="text-slate-500 mt-1">Speak with Apphia for hands-free operational guidance and real-time diagnostics.</p>
        {!srSupported && (
          <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Speech recognition not supported in this browser. Use Chrome or Edge for full voice experience.
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" : "bg-slate-600"}`} />
                <span className="text-sm font-medium text-slate-300">{isConnected ? "Session Active — Apphia Engine" : "Disconnected"}</span>
              </div>
              {error && <span className="text-xs text-rose-400 truncate max-w-[200px]">{error}</span>}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {!isConnected ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 border border-cyan-500/20">
                    <Mic className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Start Voice Session</h3>
                  <p className="text-slate-500 max-w-sm mb-6">Connect to Apphia's voice companion for real-time operational support.</p>
                  <Button onClick={startSession} size="lg" className="neon-glow-cyan">
                    <Phone className="w-5 h-5 mr-2" />
                    Connect
                  </Button>
                </div>
              ) : (
                <AnimatePresence>
                  {transcript.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-cyan-500/10 text-slate-200 border border-cyan-500/20 rounded-tr-sm"
                          : "bg-white/[0.03] text-slate-300 border border-white/[0.06] rounded-tl-sm"
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs mt-1 text-slate-600">{msg.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </motion.div>
                  ))}
                  {(isListening || isSending) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                      <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/5 rounded-full border border-cyan-500/10">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <motion.div key={i} className="w-1 bg-cyan-400 rounded-full"
                              animate={{ height: [8, 20, 8] }}
                              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-cyan-400 font-medium ml-1">
                          {isSending ? "Processing..." : "Listening..."}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {isConnected && (
              <div className="p-4 border-t border-white/[0.04]">
                <div className="flex items-center justify-center gap-4">
                  <Button variant={isMuted ? "destructive" : "outline"} size="sm" className="rounded-full w-12 h-12"
                    onClick={() => { setIsMuted(m => { if (!m) stopListening(); return !m; }); }}
                    title={isMuted ? "Unmute" : "Mute"}>
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant={isListening ? "primary" : "outline"} size="lg"
                    className={`rounded-full px-8 ${isListening ? "animate-pulse neon-glow-cyan" : ""}`}
                    onClick={toggleListening} disabled={isSending || isMuted || !srSupported}>
                    {isListening ? "Listening…" : isSending ? "Processing…" : "Push to Talk"}
                  </Button>
                  <Button variant={!isSpeakerOn ? "destructive" : "outline"} size="sm" className="rounded-full w-12 h-12"
                    onClick={() => { setIsSpeakerOn(s => { if (s) window.speechSynthesis?.cancel(); return !s; }); }}
                    title={isSpeakerOn ? "Mute speaker" : "Enable speaker"}>
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </Button>
                  <Button variant="destructive" size="sm" className="rounded-full w-12 h-12" onClick={endSession} title="End session">
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-white mb-3">Session Info</h3>
            <div className="space-y-2 text-sm">
              {[
                ["Status", isConnected ? "Active" : "Inactive", isConnected ? "text-emerald-400" : "text-slate-600"],
                ["Engine", "Apphia Voice", "text-slate-300"],
                ["Speech", srSupported ? "Browser STT" : "Not supported", srSupported ? "text-slate-300" : "text-amber-400"],
                ["TTS", "Browser Synth", "text-slate-300"],
                ["Language", "English (US)", "text-slate-300"],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-medium ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-white mb-3">Quick Commands</h3>
            <div className="space-y-2">
              {QUICK_COMMANDS.map((cmd) => (
                <button key={cmd}
                  onClick={() => isConnected && !isSending && void sendMessage(cmd)}
                  disabled={!isConnected || isSending}
                  className="w-full text-left px-3 py-2 bg-white/[0.03] hover:bg-white/[0.06] disabled:opacity-40 rounded-lg text-sm text-slate-400 font-mono border border-white/[0.04] transition-colors">
                  "{cmd}"
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
