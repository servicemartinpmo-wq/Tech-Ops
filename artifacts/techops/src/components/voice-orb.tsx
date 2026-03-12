import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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
    };
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setResponse("Voice recognition is not supported in this browser.");
      return;
    }

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
        const rms = sum / dataArray.length;
        setPulseSize(1 + rms / 30);
        animFrameRef.current = requestAnimationFrame(updatePulse);
      };
      updatePulse();
    } catch {
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      cancelAnimationFrame(animFrameRef.current);
      setPulseSize(1);
    };

    recognition.start();
    setIsListening(true);
    setTranscript("");
    setResponse("");
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    cancelAnimationFrame(animFrameRef.current);
    setPulseSize(1);

    if (transcript) {
      const lower = transcript.toLowerCase();
      if (lower.includes("dashboard")) { setLocation("/dashboard"); setIsOpen(false); }
      else if (lower.includes("case") && lower.includes("new")) { setLocation("/cases/submit"); setIsOpen(false); }
      else if (lower.includes("case")) { setLocation("/cases"); setIsOpen(false); }
      else if (lower.includes("automation")) { setLocation("/automation"); setIsOpen(false); }
      else if (lower.includes("connector") || lower.includes("health")) { setLocation("/connectors"); setIsOpen(false); }
      else if (lower.includes("apphia") || lower.includes("chat")) { setLocation("/apphia"); setIsOpen(false); }
      else if (lower.includes("billing") || lower.includes("subscription")) { setLocation("/billing"); setIsOpen(false); }
      else if (lower.includes("alert")) { setLocation("/alerts"); setIsOpen(false); }
      else {
        setResponse(`Heard: "${transcript}". Try saying "open cases", "new case", "dashboard", or "automation".`);
      }
    }
  }, [transcript, setLocation]);

  const orbSize = isListening ? 240 : 200;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) { stopListening(); setIsOpen(false); } }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative flex flex-col items-center gap-8"
            >
              <button
                onClick={() => { stopListening(); setIsOpen(false); }}
                className="absolute -top-16 -right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative" style={{ width: orbSize, height: orbSize }}>
                {[3, 2, 1].map((layer) => (
                  <motion.div
                    key={layer}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, rgba(0,240,255,${0.05 * layer}) 0%, transparent 70%)`,
                      border: `1px solid rgba(0,240,255,${0.1 * layer})`,
                    }}
                    animate={isListening ? {
                      scale: [1, pulseSize * (1 + layer * 0.15), 1],
                    } : {}}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                ))}

                <motion.button
                  onClick={isListening ? stopListening : startListening}
                  className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer focus:outline-none"
                  style={{
                    background: "radial-gradient(circle at 35% 35%, rgba(0,240,255,0.25) 0%, rgba(0,150,200,0.15) 40%, rgba(0,0,40,0.8) 100%)",
                    border: "2px solid rgba(0,240,255,0.3)",
                    boxShadow: isListening
                      ? "0 0 60px rgba(0,240,255,0.4), inset 0 0 40px rgba(0,240,255,0.1)"
                      : "0 0 30px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,240,255,0.05)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="flex flex-col items-center gap-2">
                    {isListening ? (
                      <MicOff className="w-12 h-12 text-red-400 drop-shadow-[0_0_10px_rgba(255,50,50,0.6)]" />
                    ) : (
                      <Mic className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]" />
                    )}
                    <span className="text-xs font-bold text-cyan-400/70 tracking-wider uppercase">
                      {isListening ? "Tap to stop" : "Tap to speak"}
                    </span>
                  </div>
                </motion.button>
              </div>

              <div className="text-center max-w-sm">
                {isListening && (
                  <motion.div className="flex justify-center gap-1 mb-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-cyan-400 rounded-full"
                        animate={{ height: [4, 20, 4] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </motion.div>
                )}

                {transcript && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white font-medium text-lg mb-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10"
                  >
                    "{transcript}"
                  </motion.p>
                )}

                {response && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-slate-400 text-sm"
                  >
                    {response}
                  </motion.p>
                )}

                {!transcript && !isListening && (
                  <p className="text-slate-500 text-sm">
                    Say "open cases", "new case", "dashboard", "automation"...
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
            onClick={() => setIsOpen(true)}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-all duration-300",
              isSpeaking
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                : "bg-[#1a1a28] border-white/[0.1] text-slate-500 hover:text-slate-300 hover:border-white/20"
            )}
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mic className="w-5 h-5" />
          </motion.button>
        </div>
      )}
    </>
  );
}
