import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CookingAssistantChatProps {
  recipeName: string;
  recipeText: string;
  equipment: string[];
  skillLevel: string;
}

export function CookingAssistantChat({ recipeName, recipeText, equipment, skillLevel }: CookingAssistantChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("cooking-assistant", {
        body: {
          recipeName,
          recipeText,
          equipment,
          skillLevel,
          messages: updated,
        },
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: "assistant", content: data?.reply || "Sorry, I couldn't help with that." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Try asking again." }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
          style={{ backgroundColor: "#C8892A" }}
        >
          <MessageCircle size={22} className="text-white" />
        </button>
      )}

      {/* Bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="flex-1" onClick={() => setOpen(false)} />
          <div className="bg-background rounded-t-2xl border-t border-border shadow-xl flex flex-col" style={{ height: "55vh" }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <h3 className="font-display text-base font-bold text-foreground">Cooking help</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3">
              {messages.length === 0 && (
                <p className="font-body text-sm text-muted-foreground text-center mt-8">
                  Ask anything about this recipe
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-3 py-2 font-body text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "ml-auto bg-gold/15 text-foreground"
                      : "mr-auto bg-card border border-border text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="mr-auto bg-card border border-border rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Ask anything about this recipe..."
                className="flex-1 rounded-lg border border-border bg-input px-3 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
