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

  if (isQuizLoading || isProfileLoading) return <div className="p-12 text-center">Loading...</div>;

  const questions = quiz?.questions || [];
  const hasCompleted = profile?.completed;

  const handleSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(s => s + 1), 400);
    }
  };

  const handleSubmit = () => {
    submitQuiz({ data: { answers } }, {
      onSuccess: () => refetch()
    });
  };

  if (hasCompleted) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Profile Calibrated</h1>
          <p className="text-slate-500 mt-2 text-lg">Apphia Engine is now tailored to your operational style.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-primary/20 bg-white">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Communication</h3>
            <p className="text-2xl font-display font-bold text-primary capitalize">{profile.communicationStyle}</p>
          </Card>
          <Card className="p-6 border-primary/20 bg-white">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Detail Level</h3>
            <p className="text-2xl font-display font-bold text-primary capitalize">{profile.detailLevel}</p>
          </Card>
          <Card className="p-6 border-primary/20 bg-white">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Proactivity</h3>
            <p className="text-2xl font-display font-bold text-primary capitalize">{profile.proactivity}</p>
          </Card>
          <Card className="p-6 border-primary/20 bg-white">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Technical Depth</h3>
            <p className="text-2xl font-display font-bold text-primary capitalize">{profile.technicalDepth}</p>
          </Card>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentStep];

  return (
    <div className="max-w-2xl mx-auto py-12 animate-in fade-in">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
          <Settings2 className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Style Calibration</h1>
        <p className="text-slate-500 mt-2">Help Apphia Engine understand how you prefer to work.</p>
        
        <div className="flex gap-2 justify-center mt-8">
          {questions.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i <= currentStep ? 'w-8 bg-primary' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <Card className="p-8 shadow-xl shadow-primary/5 bg-white/80 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {currentQ && (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">{currentQ.question}</h2>
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(currentQ.id, opt.value)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 group ${
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-md" 
                          : "border-slate-100 bg-white hover:border-primary/30 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-slate-700'}`}>
                          {opt.label}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-primary' : 'border-slate-300'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                      </div>
                      {opt.description && (
                        <p className={`text-sm mt-1 ${isSelected ? 'text-primary/70' : 'text-slate-500'}`}>{opt.description}</p>
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
            <Button size="lg" onClick={handleSubmit} isLoading={isSubmitting} className="w-full">
              Complete Calibration
            </Button>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
