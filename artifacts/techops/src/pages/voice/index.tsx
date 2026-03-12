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
  const [currentTranscript, setCurrentTranscript] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const startSession = () => {
    setIsConnected(true);
    setTranscript([
      {
        role: "apphia",
        content: "Voice companion active. I'm Apphia, ready to assist with diagnostics, system monitoring, and operational guidance. How can I help?",
        timestamp: new Date(),
      },
    ]);
  };

  const endSession = () => {
    setIsConnected(false);
    setIsListening(false);
    setCurrentTranscript("");
  };

  const toggleListening = () => {
    if (!isConnected) return;
    setIsListening(!isListening);
    if (!isListening) {
      setCurrentTranscript("Listening...");
    } else {
      setCurrentTranscript("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Voice Companion</h1>
        <p className="text-slate-500 mt-1">Speak with Apphia for hands-free operational guidance and real-time diagnostics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" : "bg-slate-300"}`} />
                <span className="text-sm font-medium text-slate-700">{isConnected ? "Session Active" : "Disconnected"}</span>
              </div>
              {isConnected && (
                <span className="text-xs text-slate-400 font-mono">Voice Companion v1.0</span>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {!isConnected ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-blue-100 rounded-full flex items-center justify-center mb-6">
                    <Mic className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Start Voice Session</h3>
                  <p className="text-slate-500 max-w-sm mb-6">Connect to Apphia's voice companion for real-time operational support and diagnostic guidance.</p>
                  <Button onClick={startSession} size="lg">
                    <Phone className="w-5 h-5 mr-2" />
                    Connect
                  </Button>
                </div>
              ) : (
                <AnimatePresence>
                  {transcript.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-primary text-white rounded-tr-sm"
                          : "bg-white border border-slate-200 rounded-tl-sm shadow-sm"
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === "user" ? "text-white/60" : "text-slate-400"}`}>
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {isListening && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-primary rounded-full"
                              animate={{ height: [8, 20, 8] }}
                              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-primary font-medium ml-1">Listening...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {isConnected && (
              <div className="p-4 border-t bg-slate-50/50">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="sm"
                    className="rounded-full w-12 h-12"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant={isListening ? "primary" : "outline"}
                    size="lg"
                    className={`rounded-full px-8 ${isListening ? "bg-primary animate-pulse" : ""}`}
                    onClick={toggleListening}
                  >
                    {isListening ? "Speaking..." : "Push to Talk"}
                  </Button>
                  <Button
                    variant={!isSpeakerOn ? "destructive" : "outline"}
                    size="sm"
                    className="rounded-full w-12 h-12"
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full w-12 h-12"
                    onClick={endSession}
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Session Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${isConnected ? "text-green-600" : "text-slate-400"}`}>
                  {isConnected ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode</span>
                <span className="font-medium text-slate-700">Apphia Engine</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Language</span>
                <span className="font-medium text-slate-700">English</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Voice Commands</h3>
            <div className="space-y-2">
              {[
                "Check system status",
                "Run diagnostic on case",
                "Show recent alerts",
                "Connector health report",
                "List open cases",
              ].map((cmd) => (
                <div key={cmd} className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600 font-mono">
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
