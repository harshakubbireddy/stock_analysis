import { Bot, Send, Sparkles, User } from "lucide-react";

export default function AiAnalysisPage() {
  return (
    <div className="ui-page">
      <div className="ui-container">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
            AI Analysis
          </h1>
          <p className="ui-description">
            AI-powered research and insights on any stock
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Chat window — left column */}
          <div className="flex h-[calc(100vh-12rem)] min-h-[500px] flex-col lg:w-3/5 xl:w-1/2">
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

              {/* Messages area */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {/* Assistant message */}
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                    <Bot size={18} aria-hidden="true" />
                  </span>
                  <div className="rounded-xl rounded-tl-sm bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Hi! I&apos;m your AI stock assistant. Ask me anything
                      about a company, sector, or market trend and I&apos;ll
                      pull the latest data for you.
                    </p>
                  </div>
                </div>

                {/* User message */}
                <div className="flex gap-3 justify-end">
                  <div className="rounded-xl rounded-tr-sm bg-brand-500 px-4 py-3 text-white">
                    <p className="text-sm">
                      What&apos;s the outlook on NVDA after earnings?
                    </p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                    <User size={18} aria-hidden="true" />
                  </span>
                </div>

                {/* Assistant message */}
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300">
                    <Bot size={18} aria-hidden="true" />
                  </span>
                  <div className="rounded-xl rounded-tl-sm bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      NVIDIA reported strong earnings with revenue beating
                      estimates. Data center growth remains the key driver.
                      Would you like a detailed breakdown?
                    </p>
                  </div>
                </div>
              </div>

              {/* Input area */}
              <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Ask about a stock, sector, or trend…"
                    className="ui-input flex-1"
                  />
                  <button
                    type="button"
                    className="ui-button ui-button-primary shrink-0 px-3.5"
                    aria-label="Send message"
                  >
                    <Send size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right column — intentional whitespace */}
          <div className="hidden lg:block lg:flex-1" />
        </div>
      </div>
    </div>
  );
}
