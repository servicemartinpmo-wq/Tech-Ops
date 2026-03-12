import { useState } from "react";
import { useGetPreferencesQuiz, useSubmitPreferencesQuiz, useGetPreferencesProfile } from "@workspace/api-client-react";
import { Card, Button } from "@/components/ui";
import { CheckCircle2, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PreferencesQuiz() {
  const { data: quiz, isLoading: isQuizLoading } = useGetPreferencesQuiz();
  const { data: profile, isLoading: isProfileLoading, refetch } = useGetPreferencesProfile();
  const { mutate: submitQuiz, isPending: isSubmitting } = useSubmitPreferencesQuiz();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  if (isQuizLoading || isProfileLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;

  const questions = quiz?.questions || [];
  const hasCompleted = profile?.completed;

  const handleSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(s => s + 1), 400);
    }
  };

  const handleSubmit = () => {
    submitQuiz({ data: { answers } }, { onSuccess: () => refetch() });
  };

  if (hasCompleted) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Profile Calibrated</h1>
          <p className="text-slate-500 mt-2 text-lg">Apphia Engine is now tailored to your operational style.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Communication", value: profile.communicationStyle },
            { label: "Detail Level", value: profile.detailLevel },
            { label: "Proactivity", value: profile.proactivity },
            { label: "Technical Depth", value: profile.technicalDepth },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="p-6 neon-border">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">{item.label}</h3>
                <p className="text-2xl font-display font-bold text-cyan-400 capitalize">{item.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentStep];

  return (
    <div className="max-w-2xl mx-auto py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-6 border border-cyan-500/20">
          <Settings2 className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white">Style Calibration</h1>
        <p className="text-slate-500 mt-2">Help Apphia Engine understand how you prefer to work.</p>
        
        <div className="flex gap-2 justify-center mt-8">
          {questions.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i <= currentStep ? 'w-8 bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.4)]' : 'w-2 bg-white/10'}`} />
          ))}
        </div>
      </motion.div>

      <Card className="p-8 neon-border overflow-hidden relative">
        <AnimatePresence mode="wait">
          {currentQ && (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-display font-bold text-white mb-6">{currentQ.question}</h2>
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(currentQ.id, opt.value)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 group ${
                        isSelected 
                          ? "border-cyan-500/50 bg-cyan-500/5 shadow-md shadow-cyan-500/10" 
                          : "border-white/[0.06] bg-white/[0.02] hover:border-cyan-500/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${isSelected ? 'text-cyan-400' : 'text-slate-300'}`}>
                          {opt.label}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-cyan-400' : 'border-slate-600'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                        </div>
                      </div>
                      {opt.description && (
                        <p className={`text-sm mt-1 ${isSelected ? 'text-cyan-400/70' : 'text-slate-500'}`}>{opt.description}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentStep === questions.length - 1 && Object.keys(answers).length === questions.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-center">
            <Button size="lg" onClick={handleSubmit} isLoading={isSubmitting} className="w-full neon-glow-cyan">
              Complete Calibration
            </Button>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
