"use client";

import { Bot, HelpCircle, LayoutGrid, Send, Sparkles, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const QUICK_STARTS = [
  "How are stocks doing today?",
  "Analyze AAPL",
  "What is smart money doing?",
  "What is the latest CPI report?",
];

const COMPONENT_LABELS: Record<string, string> = {
  stock_market_overview: "Market Overview",
  bond_market_overview: "Bond Market",
  cpi_report: "Inflation",
  upcoming_economic_events: "Economic Calendar",
  smart_money: "Smart Money",
  stock_analysis_by_symbol: "Stock Analysis",
  news_summary: "News",
};

function AssistantAvatar() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
      <Bot size={18} aria-hidden="true" />
    </span>
  );
}

export function AiChatDashboard() {
  const { messages, isLoading, sendMessage, components } = useChat();
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send(text: string) {
    if (!text.trim() || isLoading) return;
    setThinking(randomThinkingMessage());
    sendMessage(text);
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function pickSuggestion(question: string) {
    setInput(question);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  const lastIndex = messages.length - 1;

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[560px] flex-col gap-4 md:gap-6 lg:flex-row">
      {/* Generated UI components — scrolls independently */}
      <div className="order-2 flex min-h-0 flex-1 flex-col lg:order-1">
        <div className="mb-3 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-gray-400" aria-hidden="true" />
            <p className="ui-label">Generated insights</p>
          </div>
          {components.length > 0 && (
            <span className="ui-badge ui-badge-neutral">
              {components.length} {components.length === 1 ? "panel" : "panels"}
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-6">
          {components.length > 0 ? (
            <div className="space-y-6">
              {components.map((c, i) => (
                <section key={i} className="ui-chat-section">
                  <div className="ui-chat-section-header">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                    <p className="ui-label">{COMPONENT_LABELS[c.name] ?? c.name}</p>
                  </div>
                  <ChatComponent name={c.name} props={c.props} />
                </section>
              ))}
            </div>
          ) : (
            <div className="ui-card flex h-full min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <span className="ui-icon-box mb-4 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                <Sparkles size={22} aria-hidden="true" />
              </span>
              <p className="ui-section-title">Your insights will appear here</p>
              <p className="ui-description mt-1 max-w-sm">
                Ask about the market, a ticker, inflation, or what hedge funds
                and Congress are trading. Charts and tables render live.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    disabled={isLoading}
                    className="ui-badge ui-badge-brand cursor-pointer px-3 py-1.5 transition-colors hover:bg-brand-100 disabled:opacity-50 dark:hover:bg-brand-500/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat column — fixed readable width on desktop */}
      <div className="order-1 flex min-h-[360px] flex-col lg:order-2 lg:w-[400px] lg:shrink-0 xl:w-[440px]">
        <div className="ui-card flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <span className="ui-icon-box h-10 w-10 bg-brand-500 text-white">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="ui-section-title">AI Stock Assistant</p>
              <p className="ui-caption truncate">
                Ask about any ticker, sector, or market trend
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {messages.length === 0 && (
              <div className="flex gap-3">
                <AssistantAvatar />
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Hi! I&apos;m your AI stock assistant. Ask me anything about a
                    company, sector, or market trend — or tap the{" "}
                    <HelpCircle size={14} className="inline -mt-0.5" aria-hidden="true" />{" "}
                    button for ideas.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const isLast = i === lastIndex;
              if (m.role === "user") {
                return (
                  <div key={i} className="flex justify-end gap-3">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand-500 px-4 py-3 text-white shadow-theme-xs">
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                      <User size={18} aria-hidden="true" />
                    </span>
                  </div>
                );
              }
              const streaming = isLoading && isLast;
              return (
                <div key={i} className="flex gap-3">
                  <AssistantAvatar />
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
                    {m.content ? (
                      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                        {m.content}
                        {streaming && (
                          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brand-500 align-middle" />
                        )}
                      </p>
                    ) : streaming ? (
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1" aria-hidden="true">
                          <span className="ui-typing-dot" />
                          <span className="ui-typing-dot" />
                          <span className="ui-typing-dot" />
                        </span>
                        <span className="ui-caption italic">{thinking}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 dark:border-gray-800">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 transition-colors focus-within:border-brand-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgb(70_95_255/0.12)] dark:border-gray-800 dark:bg-white/[0.03] dark:focus-within:bg-gray-900">
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
                aria-label="Suggested questions"
                title="Suggested questions"
              >
                <HelpCircle size={18} aria-hidden="true" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a stock, sector, or trend…"
                className="min-w-0 flex-1 bg-transparent px-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white/90"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-white/10 dark:disabled:text-gray-500"
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
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] transition-opacity"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="suggestions-title"
            className="ui-card relative z-10 max-h-[80vh] w-full max-w-2xl overflow-y-auto shadow-theme-md"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <span className="ui-icon-box h-9 w-9 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                  <HelpCircle size={18} aria-hidden="true" />
                </span>
                <div>
                  <p id="suggestions-title" className="ui-section-title">Suggested questions</p>
                  <p className="ui-caption">Pick one to drop it into the chat box</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close suggestions"
                onClick={() => setShowSuggestions(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              {SUGGESTION_CATEGORIES.map((cat) => (
                <div key={cat.title} className="ui-tile">
                  <p className="ui-label mb-2">{cat.title}</p>
                  <div className="space-y-1">
                    {cat.questions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => pickSuggestion(q)}
                        className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-white hover:text-brand-600 hover:shadow-theme-xs dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-brand-300"
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
    </div>
  );
}
