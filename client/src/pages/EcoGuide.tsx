import { useState } from "react";
import Navigation from "@/components/Navigation";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { Bot, ShieldCheck } from "lucide-react";

const suggestions = [
  "Why does our classroom use so much electricity?",
  "Which mission would help me learn about water?",
  "How can I measure waste in my school?",
];

export default function EcoGuide() {
  const [messages, setMessages] = useState<Message[]>([]);
  const chatMutation = trpc.ecoGuide.chat.useMutation({
    onSuccess: ({ content }) => setMessages((current) => [...current, { role: "assistant", content }]),
  });

  const sendMessage = (content: string) => {
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    chatMutation.mutate({ messages: next.map(({ role, content: text }) => ({ role, content: text })) });
  };

  return <div className="min-h-screen bg-background"><Navigation /><main className="container max-w-5xl px-6 pb-20 pt-12 md:pt-20"><section className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950 p-8 text-white shadow-xl md:p-12"><div className="flex items-center gap-3"><Bot className="h-8 w-8 text-cyan-200" /><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">AI learning mentor</p></div><h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">EcoGuide</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-emerald-50/80">Ask questions, understand the SDGs, improve your investigation, and find a meaningful next step.</p></section><div className="mb-5 flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" /><p>AI-generated guidance is advisory. EcoGuide never awards points or replaces teacher verification.</p></div><AIChatBox messages={messages} onSendMessage={sendMessage} isLoading={chatMutation.isPending} suggestedPrompts={suggestions} emptyStateMessage="Start with a sustainability question" placeholder="Ask EcoGuide about sustainability..." height="620px" />{chatMutation.isError && <p className="mt-3 text-sm text-destructive">EcoGuide is unavailable right now. Please try again.</p>}</main></div>;
}
