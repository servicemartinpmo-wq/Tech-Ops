import { useState, useEffect, useRef } from "react";
import { useListOpenaiConversations, useCreateOpenaiConversation, useListOpenaiMessages } from "@workspace/api-client-react";
import { useSseChat } from "@/hooks/use-sse-chat";
import { Card, Button, Input } from "@/components/ui";
import { MessageSquarePlus, Send, Sparkles, Cpu, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function ApphiaChat() {
  const { data: conversations, isLoading: isConvosLoading } = useListOpenaiConversations();
  const { mutate: createConvo } = useCreateOpenaiConversation();
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputMsg, setInputMsg] = useState("");
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

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMsg.trim() || !activeId || isStreaming) return;
    sendMessage(inputMsg);
    setInputMsg("");
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
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {!activeId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Sparkles className="w-12 h-12 mb-4 opacity-50" />
              <p>Select or create a session to begin.</p>
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
                      "p-4 rounded-2xl text-sm leading-relaxed border",
                      isUser 
                        ? "bg-cyan-500/10 text-slate-200 border-cyan-500/20 rounded-tr-sm" 
                        : "bg-white/[0.03] text-slate-300 border-white/[0.06] rounded-tl-sm"
                    )}>
                      {msg.content}
                    </div>
                  </motion.div>
                );
              })}

              {(isStreaming || streamedText) && (
                <div className="flex gap-4 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 mt-1">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="p-4 rounded-2xl text-sm leading-relaxed border bg-white/[0.03] text-slate-300 border-white/[0.06] rounded-tl-sm min-w-[3rem]">
                    {streamedText || <span className="flex gap-1 items-center h-5"><span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} /><span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}} /></span>}
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
              placeholder="Ask Apphia to analyze a log, explain a system, or extract a signal..."
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
            Apphia Style Engine automatically adapts tone based on your Preferences Profile.
          </p>
        </div>
      </Card>
    </div>
  );
}
