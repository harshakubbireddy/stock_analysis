"use client";

import { Bot, HelpCircle, Send, Sparkles, User, X } from "lucide-react";
import { useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatComponent } from "@/components/ChatComponent";

const THINKING_MESSAGES = [
  "Thinking…",
  "Let me look into that…",
  "Checking the data…",
  "Crunching the numbers…",
  "Pulling the latest figures…",
  "One moment…",
  "Digging deep…",
  "Generating a response…",
];

function randomThinkingMessage() {
  return THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
}

type SuggestionCategory = {
  title: string;
  questions: string[];
};

const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  {
    title: "Stock Market",
    questions: [
      "How are stocks doing today?",
      "How is the market performing?",
      "Show me sector performance",
    ],
  },
  {
    title: "Bonds & Rates",
    questions: [
      "How is the bond market doing?",
      "What are Treasury yields today?",
      "Is the yield curve inverted?",
    ],
  },
  {
    title: "Economy & Inflation",
    questions: [
      "What is the latest CPI report?",
      "What are the upcoming economic events?",
      "How is inflation trending?",
    ],
  },
  {
    title: "Stock Analysis",
    questions: [
      "Analyze AAPL",
      "What is the analysis for TSLA?",
      "Give me a breakdown of NVDA",
    ],
  },
  {
    title: "Smart Money",
    questions: [
      "What is smart money doing?",
      "What are hedge funds buying?",
      "What are politicians trading?",
    ],
  },
];

export function AiChatDashboard() {
  const { messages, isLoading, sendMessage, components } = useChat();
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setThinking(randomThinkingMessage());
    sendMessage(input);
    setInput("");
  }

  function pickSuggestion(question: string) {
    setInput(question);
    setShowSuggestions(false);
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[500px] flex-col gap-6 lg:flex-row">
      {/* Right: Chat (text only Q&A) — fixed, scrolls internally */}
      <div className="flex flex-1 flex-col lg:order-2 lg:w-3/5 xl:w-1/2">
        <div className="ui-card flex flex-1 flex-col overflow-hidden">
          {/* Chat header */}
          <div className="ui-card-header border-b border-gray-200 pb-4 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="ui-icon-box h-10 w-10 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                <Sparkles size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="ui-title">AI Stock Assistant</p>
                <p className="ui-description">
                  Ask about any ticker, sector, or market trend
                </p>
              </div>
            </div>
          </div>

          {/* Messages area — text only */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto p-5"
          >
            {messages.length === 0 && (
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                  <Bot size={18} aria-hidden="true" />
                </span>
                <div className="rounded-xl rounded-tl-sm bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Hi! I'm your AI stock assistant. Ask me anything about
                    a company, sector, or market trend.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex gap-3 justify-end">
                  <div className="rounded-xl rounded-tr-sm bg-brand-500 px-4 py-3 text-white">
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                    <User size={18} aria-hidden="true" />
                  </span>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                    <Bot size={18} aria-hidden="true" />
                  </span>
                  <div className="rounded-xl rounded-tl-sm bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                    <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {m.content ||
                        (isLoading && i === messages.length - 1 && (
                          <span className="italic text-gray-400 dark:text-gray-500">
                            {thinking}
                          </span>
                        ))}
                      {isLoading && i === messages.length - 1 && (
                        <span className="ml-1 inline-block h-3 w-2 animate-pulse bg-gray-400 align-middle" />
                      )}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 p-4 dark:border-gray-800"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="ui-button ui-button-secondary shrink-0 px-3"
                aria-label="Suggested questions"
                title="Suggested questions"
              >
                <HelpCircle size={18} aria-hidden="true" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a stock, sector, or trend…"
                className="ui-input flex-1"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="ui-button ui-button-primary shrink-0 px-3.5 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Suggested questions modal */}
      {showSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close suggestions"
            onClick={() => setShowSuggestions(false)}
            className="absolute inset-0 bg-gray-900/50 transition-opacity"
          />
          <div className="relative z-10 w-full max-w-lg ui-card max-h-[80vh] overflow-y-auto">
            <div className="ui-card-header sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <span className="ui-icon-box h-8 w-8 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                  <HelpCircle size={16} aria-hidden="true" />
                </span>
                <p className="ui-title text-sm">Suggested Questions</p>
              </div>
              <button
                type="button"
                aria-label="Close suggestions"
                onClick={() => setShowSuggestions(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {SUGGESTION_CATEGORIES.map((cat) => (
                <div key={cat.title}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {cat.title}
                  </p>
                  <div className="space-y-1.5">
                    {cat.questions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => pickSuggestion(q)}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Left: Generated UI components — only this column scrolls */}
      <div className="lg:order-1 lg:flex-1 overflow-y-auto pr-1 space-y-6">
        {components.length > 0 ? (
          components.map((c, i) => (
            <ChatComponent key={i} name={c.name} props={c.props} />
          ))
        ) : (
          <div className="ui-card hidden p-6 lg:block">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generated components will appear here when you ask about the
              market, stocks, or other data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
