import { useState, useEffect, useRef } from "react";
import { useListOpenaiConversations, useCreateOpenaiConversation, useListOpenaiMessages } from "@workspace/api-client-react";
import { useSseChat } from "@/hooks/use-sse-chat";
import { Card, Button, Input } from "@/components/ui";
import { MessageSquarePlus, Send, Sparkles, Cpu, User, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h4 key={i} className="font-display font-bold text-white text-base mt-3 first:mt-0">{line.slice(3)}</h4>;
        }
        if (line.startsWith("### ")) {
          return <h5 key={i} className="font-bold text-cyan-400 text-sm mt-2 first:mt-0">{line.slice(4)}</h5>;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-bold text-white">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 mt-2 shrink-0" />
              <span className="text-slate-300">{line.slice(2)}</span>
            </div>
          );
        }
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1];
          return (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0 mt-0.5">{num}</span>
              <span className="text-slate-300">{line.replace(/^\d+\. /, "")}</span>
            </div>
          );
        }
        if (line.startsWith("Thinking: ") || line.startsWith("> ")) {
          const text = line.startsWith("Thinking: ") ? line.slice(10) : line.slice(2);
          return (
            <div key={i} className="flex items-start gap-2 py-1.5 px-3 rounded-lg bg-amber-500/5 border-l-2 border-amber-500/40">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-amber-300/80 italic text-xs">{text}</span>
            </div>
          );
        }
        if (line.startsWith("**Action Items:**") || line.startsWith("**Next Steps:**") || line.startsWith("**Plan:**")) {
          return <p key={i} className="font-bold text-white mt-3">{line.replace(/\*\*/g, "")}</p>;
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="text-slate-300">{line}</p>;
      })}
    </div>
  );
}

const CLARIFYING_PROMPTS = [
  "Can you describe when this issue first started and what changed before it appeared?",
  "Which systems or services are affected? Is this limited to one connector or spread across multiple?",
  "Are you seeing any error messages or codes? If so, what do they say?",
  "How many users or workflows are impacted right now?",
  "Have you made any recent changes — deployments, config updates, or infrastructure changes?",
];

export default function ApphiaChat() {
  const { data: conversations, isLoading: isConvosLoading } = useListOpenaiConversations();
  const { mutate: createConvo } = useCreateOpenaiConversation();
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputMsg, setInputMsg] = useState("");
  const [showPrompts, setShowPrompts] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversations?.length && !activeId) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const messagesQuery = useListOpenaiMessages(activeId || 0);
  const messages = activeId ? messagesQuery.data : undefined;
  const { sendMessage, isStreaming, streamedText } = useSseChat(activeId);

  const handleNewChat = () => {
    createConvo({ data: { title: "New Diagnostic Session" } }, {
      onSuccess: (newConvo) => setActiveId(newConvo.id)
    });
  };

  const handleSend = (e?: React.FormEvent, override?: string) => {
    e?.preventDefault();
    const msg = override || inputMsg;
    if (!msg.trim() || !activeId || isStreaming) return;
    sendMessage(msg);
    setInputMsg("");
  };

  const handlePromptClick = (prompt: string) => {
    setInputMsg(prompt);
    setShowPrompts(false);
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6">
      <Card className="w-80 flex flex-col p-0 overflow-hidden shrink-0">
        <div className="p-4 border-b border-white/[0.04]">
          <Button onClick={handleNewChat} className="w-full">
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {isConvosLoading ? (
            <p className="text-center text-sm text-slate-600 p-4">Loading sessions...</p>
          ) : conversations?.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl text-sm transition-all duration-200 border",
                activeId === c.id 
                  ? "bg-cyan-500/[0.08] border-cyan-500/20 text-cyan-400" 
                  : "border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"
              )}
            >
              <p className="font-medium truncate">{c.title}</p>
              <p className="text-xs opacity-60 mt-1">{format(new Date(c.createdAt), "MMM d, h:mm a")}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex-1 flex flex-col p-0 overflow-hidden relative">
        <div className="h-16 border-b border-white/[0.04] px-6 flex items-center justify-between sticky top-0 z-10 bg-showroom-card/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white">Apphia Knowledge Engine</h2>
              <p className="text-xs font-medium text-cyan-400 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                Active and ready
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPrompts(prev => !prev)}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors border border-white/[0.06] rounded-lg px-3 py-2"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Suggestions
            {showPrompts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <AnimatePresence>
          {showPrompts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/[0.04] overflow-hidden"
            >
              <div className="p-4 bg-amber-500/[0.03]">
                <p className="text-xs text-amber-400/80 mb-3 font-medium">Common diagnostic starting points — Apphia will ask clarifying questions:</p>
                <div className="flex flex-wrap gap-2">
                  {CLARIFYING_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handlePromptClick(p)}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left"
                    >
                      {p.length > 60 ? p.slice(0, 57) + "..." : p}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {!activeId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Sparkles className="w-12 h-12 mb-4 opacity-50" />
              <p>Select or create a session to begin.</p>
              <p className="text-xs mt-2 opacity-60 text-center max-w-xs">Apphia will ask clarifying questions before proposing any resolution steps.</p>
            </div>
          ) : (
            <>
              {messages?.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex gap-4 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "")}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1", isUser ? "bg-white/[0.05]" : "bg-cyan-500/10")}>
                      {isUser ? <User className="w-4 h-4 text-slate-400" /> : <Cpu className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl border max-w-[85%]",
                      isUser 
                        ? "bg-cyan-500/10 text-slate-200 border-cyan-500/20 rounded-tr-sm" 
                        : "bg-white/[0.03] border-white/[0.06] rounded-tl-sm"
                    )}>
                      {isUser ? (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      ) : (
                        <FormattedMessage content={msg.content} />
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {(isStreaming || streamedText) && (
                <div className="flex gap-4 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 mt-1">
                    <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                  </div>
                  <div className="p-4 rounded-2xl border bg-white/[0.03] border-white/[0.06] rounded-tl-sm min-w-[3rem] max-w-[85%]">
                    {streamedText 
                      ? <FormattedMessage content={streamedText} />
                      : (
                        <span className="flex gap-1 items-center h-5">
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}} />
                        </span>
                      )
                    }
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/[0.04]">
          <form onSubmit={handleSend} className="relative flex items-center max-w-4xl mx-auto">
            <Input
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Describe an issue — Apphia will ask you a few questions before diagnosing..."
              className="pr-14 py-4 h-auto text-base rounded-2xl"
              disabled={!activeId || isStreaming}
            />
            <Button 
              type="submit" 
              size="sm" 
              className="absolute right-2 h-10 w-10 p-0 rounded-xl"
              disabled={!inputMsg.trim() || !activeId || isStreaming}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-center text-xs text-slate-600 mt-3 font-medium tracking-wide">
            Apphia asks before acting. Responses adapt to your Preferences Profile.
          </p>
        </div>
      </Card>
    </div>
  );
}
