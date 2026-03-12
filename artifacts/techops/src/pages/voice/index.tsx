import { useState, useRef, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceMessage {
  role: "user" | "apphia";
  content: string;
  timestamp: Date;
}

export default function VoicePanel() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<VoiceMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  const startSession = () => {
    setIsConnected(true);
    setTranscript([{
      role: "apphia",
      content: "Voice companion active. I'm Apphia, ready to assist with diagnostics, system monitoring, and operational guidance. How can I help?",
      timestamp: new Date(),
    }]);
  };

  const endSession = () => { setIsConnected(false); setIsListening(false); };

  const toggleListening = () => {
    if (!isConnected) return;
    setIsListening(!isListening);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white text-glow">Voice Companion</h1>
        <p className="text-slate-500 mt-1">Speak with Apphia for hands-free operational guidance and real-time diagnostics.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" : "bg-slate-600"}`} />
                <span className="text-sm font-medium text-slate-300">{isConnected ? "Session Active" : "Disconnected"}</span>
              </div>
              {isConnected && <span className="text-xs text-slate-600 font-mono">Voice Companion v1.0</span>}
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
                  {isListening && (
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
                        <span className="text-xs text-cyan-400 font-medium ml-1">Listening...</span>
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
                    onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  <Button variant={isListening ? "primary" : "outline"} size="lg"
                    className={`rounded-full px-8 ${isListening ? "animate-pulse neon-glow-cyan" : ""}`}
                    onClick={toggleListening}>
                    {isListening ? "Speaking..." : "Push to Talk"}
                  </Button>
                  <Button variant={!isSpeakerOn ? "destructive" : "outline"} size="sm" className="rounded-full w-12 h-12"
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}>
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </Button>
                  <Button variant="destructive" size="sm" className="rounded-full w-12 h-12" onClick={endSession}>
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
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${isConnected ? "text-emerald-400" : "text-slate-600"}`}>
                  {isConnected ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode</span>
                <span className="font-medium text-slate-300">Apphia Engine</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Language</span>
                <span className="font-medium text-slate-300">English</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-white mb-3">Voice Commands</h3>
            <div className="space-y-2">
              {["Check system status", "Run diagnostic on case", "Show recent alerts", "Connector health report", "List open cases"].map((cmd) => (
                <div key={cmd} className="px-3 py-2 bg-white/[0.03] rounded-lg text-sm text-slate-400 font-mono border border-white/[0.04]">
                  "{cmd}"
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
