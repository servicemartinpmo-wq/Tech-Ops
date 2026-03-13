import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BrainCircuit, Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const APPHIA_RESPONSES: Record<string, string> = {
  dashboard: "Navigating you to the dashboard. I've preloaded your live metrics and connector health status.",
  cases: "Opening your case management center. All active diagnostics are visible there.",
  "new case": "Taking you to the case submission form. Describe your issue and I'll begin a full diagnostic.",
  automation: "Opening the Automation Center. You can schedule, review, and deploy playbooks from there.",
  connectors: "Pulling up your connector health panel. I'll run a live poll as you load in.",
  alerts: "Here are your system alerts. I've ranked them by severity and impact.",
  billing: "Opening your subscription dashboard. I'll show your current plan and usage.",
  apphia: "You're already speaking with me. Ask me anything about your stack.",
  vault: "Opening the Secure Share Vault. All files are encrypted with AES-256.",
  "issue log": "Here is your full Issue Activity Log, sorted by most recent.",
  pmo: "Loading the PMO-Ops intelligence center.",
  remote: "Opening Remote Assistance. Screen-share and terminal access are available.",
};

function getApphiaResponse(transcript: string): { response: string; route?: string } {
  const t = transcript.toLowerCase();
  if (t.includes("new case") || (t.includes("submit") && t.includes("case"))) {
    return { response: APPHIA_RESPONSES["new case"], route: "/cases/submit" };
  }
  if (t.includes("dashboard")) return { response: APPHIA_RESPONSES.dashboard, route: "/dashboard" };
  if (t.includes("case")) return { response: APPHIA_RESPONSES.cases, route: "/cases" };
  if (t.includes("automation")) return { response: APPHIA_RESPONSES.automation, route: "/automation" };
  if (t.includes("connector") || t.includes("health")) return { response: APPHIA_RESPONSES.connectors, route: "/connectors" };
  if (t.includes("alert")) return { response: APPHIA_RESPONSES.alerts, route: "/alerts" };
  if (t.includes("billing") || t.includes("subscription")) return { response: APPHIA_RESPONSES.billing, route: "/billing" };
  if (t.includes("apphia") || t.includes("chat")) return { response: APPHIA_RESPONSES.apphia, route: "/apphia" };
  if (t.includes("vault")) return { response: APPHIA_RESPONSES.vault, route: "/secure-vault" };
  if (t.includes("issue log") || t.includes("activity log")) return { response: APPHIA_RESPONSES["issue log"], route: "/issue-log" };
  if (t.includes("pmo")) return { response: APPHIA_RESPONSES.pmo, route: "/pmo-ops" };
  if (t.includes("remote")) return { response: APPHIA_RESPONSES.remote, route: "/remote-assistance" };
  return {
    response: `I heard "${transcript}". Try saying: "open cases", "new case", "dashboard", "automation", "connectors", or "alerts".`,
  };
}

export function VoiceOrb() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [pulseSize, setPulseSize] = useState(1);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const [, setLocation] = useLocation();

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes("Samantha") || v.name.includes("Karen") ||
        v.name.includes("Google US English") || v.name.includes("Zira") ||
        (v.lang === "en-US" && !v.name.includes("compact"))
      ) || voices.find(v => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;
    };
    loadVoice();
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); onDone?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(utterance);
  }, []);

  const processTranscript = useCallback((text: string) => {
    if (!text.trim()) return;
    const { response: resp, route } = getApphiaResponse(text);
    setResponse(resp);
    speak(resp, () => {
      if (route) {
        setTimeout(() => {
          setIsOpen(false);
          setLocation(route);
        }, 400);
      }
    });
  }, [speak, setLocation]);

  const startListening = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const msg = "Voice recognition is not supported in this browser. Please use Chrome or Edge.";
      setResponse(msg);
      speak(msg);
      return;
    }
    window.speechSynthesis?.cancel();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const updatePulse = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (const v of dataArray) sum += Math.abs(v - 128);
        setPulseSize(1 + (sum / dataArray.length) / 28);
        animFrameRef.current = requestAnimationFrame(updatePulse);
      };
      updatePulse();
    } catch { }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setTranscript(finalTranscript || interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      cancelAnimationFrame(animFrameRef.current);
      setPulseSize(1);
      if (finalTranscript) processTranscript(finalTranscript);
    };

    recognition.start();
    setIsListening(true);
    setTranscript("");
    setResponse("");
    finalTranscript = "";
  }, [processTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    cancelAnimationFrame(animFrameRef.current);
    setPulseSize(1);
  }, []);

  const closeOrb = useCallback(() => {
    stopListening();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setIsOpen(false);
  }, [stopListening]);

  const handleOrbOpen = useCallback(() => {
    setIsOpen(true);
    setTranscript("");
    setResponse("");
    setTimeout(() => startListening(), 600);
  }, [startListening]);

  const orbSize = isListening ? 240 : isSpeaking ? 220 : 200;
  const orbColor = isSpeaking ? "rgba(138,43,226," : "rgba(0,240,255,";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) closeOrb(); }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative flex flex-col items-center gap-8"
            >
              <button
                onClick={closeOrb}
                className="absolute -top-16 -right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-2">
                <p className="text-xs font-bold tracking-[0.25em] uppercase text-slate-500">Apphia Voice</p>
              </div>

              <div className="relative" style={{ width: orbSize, height: orbSize }}>
                {[3, 2, 1].map((layer) => (
                  <motion.div
                    key={layer}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${orbColor}${0.05 * layer}) 0%, transparent 70%)`,
                      border: `1px solid ${orbColor}${0.12 * layer})`,
                    }}
                    animate={isListening || isSpeaking ? {
                      scale: [1, pulseSize * (1 + layer * 0.12), 1],
                    } : { scale: 1 }}
                    transition={{ duration: 0.15, ease: "linear" }}
                  />
                ))}

                <motion.button
                  onClick={isListening ? stopListening : startListening}
                  className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer focus:outline-none"
                  style={{
                    background: isSpeaking
                      ? "radial-gradient(circle at 35% 35%, rgba(138,43,226,0.25) 0%, rgba(80,20,130,0.15) 40%, rgba(10,0,40,0.85) 100%)"
                      : "radial-gradient(circle at 35% 35%, rgba(0,240,255,0.22) 0%, rgba(0,150,200,0.12) 40%, rgba(0,0,40,0.85) 100%)",
                    border: isSpeaking
                      ? "2px solid rgba(138,43,226,0.4)"
                      : "2px solid rgba(0,240,255,0.3)",
                    boxShadow: isListening
                      ? "0 0 60px rgba(0,240,255,0.45), inset 0 0 40px rgba(0,240,255,0.1)"
                      : isSpeaking
                        ? "0 0 60px rgba(138,43,226,0.5), inset 0 0 40px rgba(138,43,226,0.1)"
                        : "0 0 30px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,240,255,0.05)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="flex flex-col items-center gap-3">
                    {isSpeaking ? (
                      <Volume2 className="w-10 h-10 text-violet-400 drop-shadow-[0_0_12px_rgba(138,43,226,0.7)]" />
                    ) : (
                      <BrainCircuit className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]" />
                    )}
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase"
                      style={{ color: isSpeaking ? "rgba(192,132,252,0.7)" : "rgba(0,240,255,0.7)" }}>
                      {isListening ? "Listening…" : isSpeaking ? "Speaking" : "Tap to speak"}
                    </span>
                  </div>
                </motion.button>
              </div>

              <div className="text-center max-w-sm w-full min-h-[80px]">
                {isListening && (
                  <motion.div className="flex justify-center gap-1 mb-3">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-cyan-400 rounded-full"
                        animate={{ height: [3, 18 + Math.random() * 10, 3] }}
                        transition={{ duration: 0.5 + i * 0.07, repeat: Infinity, delay: i * 0.08 }}
                      />
                    ))}
                  </motion.div>
                )}

                {isSpeaking && (
                  <motion.div className="flex justify-center gap-1 mb-3">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-violet-400 rounded-full"
                        animate={{ height: [3, 22, 3] }}
                        transition={{ duration: 0.45 + i * 0.06, repeat: Infinity, delay: i * 0.07 }}
                      />
                    ))}
                  </motion.div>
                )}

                {transcript && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white font-medium text-base mb-3 bg-white/[0.06] rounded-xl px-4 py-2.5 border border-white/10"
                  >
                    "{transcript}"
                  </motion.p>
                )}

                {response && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start gap-2 bg-violet-500/[0.08] rounded-xl px-4 py-2.5 border border-violet-500/20"
                  >
                    <BrainCircuit className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <p className="text-slate-300 text-sm text-left">{response}</p>
                  </motion.div>
                )}

                {!transcript && !isListening && !isSpeaking && !response && (
                  <p className="text-slate-600 text-sm">
                    Say "open cases", "new case", "dashboard", "automation"…
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <div className="fixed bottom-24 right-6 z-50">
          <motion.button
            onClick={handleOrbOpen}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-all duration-300",
              isSpeaking
                ? "bg-violet-500/20 border-violet-500/50 text-violet-400"
                : "bg-[#1a1a28] border-white/[0.1] text-slate-400 hover:text-slate-200 hover:border-white/20"
            )}
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
            title="Apphia Voice"
          >
            <BrainCircuit className="w-5 h-5" />
          </motion.button>
        </div>
      )}
    </>
  );
}
