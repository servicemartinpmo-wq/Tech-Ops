import { useState, useEffect, useRef } from "react";
import { useListOpenaiConversations, useCreateOpenaiConversation, useListOpenaiMessages } from "@workspace/api-client-react";
import { useSseChat } from "@/hooks/use-sse-chat";
import { Card, Button, Input } from "@/components/ui";
import { MessageSquarePlus, Send, Sparkles, Bot, User, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ApphiaChat() {
  const { data: conversations, isLoading: isConvosLoading } = useListOpenaiConversations();
  const { mutate: createConvo } = useCreateOpenaiConversation();
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputMsg, setInputMsg] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations?.length && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const { data: messages, isLoading: isMessagesLoading } = useListOpenaiMessages(activeId || 0, { query: { enabled: !!activeId } });
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

  // Scroll to bottom
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6 animate-in fade-in duration-500">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col p-0 overflow-hidden border-slate-200 shrink-0 bg-white/60">
        <div className="p-4 border-b">
          <Button onClick={handleNewChat} className="w-full bg-slate-900 text-white hover:bg-slate-800">
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {isConvosLoading ? (
            <p className="text-center text-sm text-slate-500 p-4">Loading sessions...</p>
          ) : conversations?.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl text-sm transition-all duration-200 border",
                activeId === c.id 
                  ? "bg-primary/5 border-primary/20 text-primary shadow-sm" 
                  : "border-transparent text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm"
              )}
            >
              <p className="font-medium truncate">{c.title}</p>
              <p className="text-xs opacity-60 mt-1">{format(new Date(c.createdAt), "MMM d, h:mm a")}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-white/80 border-slate-200 shadow-sm relative">
        {/* Header */}
        <div className="h-16 border-b bg-white/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-100 flex items-center justify-center p-1 border border-primary/10">
              <img src={`${import.meta.env.BASE_URL}images/apphia-avatar.png`} alt="Apphia" className="w-full h-full object-contain mix-blend-multiply opacity-80" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-900">Apphia Knowledge Engine</h2>
              <p className="text-xs font-medium text-primary flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Active and ready
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
          {!activeId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Sparkles className="w-12 h-12 mb-4 opacity-50" />
              <p>Select or create a session to begin.</p>
            </div>
          ) : (
            <>
              {messages?.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={cn("flex gap-4 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1", isUser ? "bg-slate-200" : "bg-primary/10")}>
                      {isUser ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4 text-primary" />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-sm border",
                      isUser 
                        ? "bg-slate-900 text-white border-slate-800 rounded-tr-sm" 
                        : "bg-white text-slate-800 border-slate-200 rounded-tl-sm"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {/* Streaming Message */}
              {(isStreaming || streamedText) && (
                <div className="flex gap-4 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="p-4 rounded-2xl text-sm leading-relaxed shadow-sm border bg-white text-slate-800 border-slate-200 rounded-tl-sm min-w-[3rem]">
                    {streamedText || <span className="flex gap-1 items-center h-5"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} /><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}} /></span>}
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSend} className="relative flex items-center max-w-4xl mx-auto">
            <Input
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Ask Apphia to analyze a log, explain a system, or extract a signal..."
              className="pr-14 py-4 h-auto text-base rounded-2xl shadow-sm border-slate-200 bg-slate-50/50 focus:bg-white"
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
          <p className="text-center text-xs text-slate-400 mt-3 font-medium tracking-wide">
            Apphia Style Engine automatically adapts tone based on your Preferences Profile.
          </p>
        </div>
      </Card>
    </div>
  );
}
