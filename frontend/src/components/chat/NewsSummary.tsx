"use client";

import { ExternalLink, Newspaper, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatCard } from "./ChatCard";

// =========================================================
// News Summary — list of latest headlines with AI summaries
// and the AI's overall take, rendered alongside the list.
// =========================================================
type NewsItem = {
  title: string;
  summary: string | null;
  ai_summary: string | null;
  publisher: string | null;
  url: string | null;
  published: string | null;
  symbol: string | null;
};

export function NewsSummary(props: Record<string, unknown>) {
  const items = (props.items as NewsItem[]) ?? [];
  const aiTake = (props.ai_take as string) ?? "";
  const isStockTake = aiTake.includes("## What is the stock's moat?");

  return (
    <div className="space-y-4 md:space-y-6">
      <ChatCard
        title="Latest Headlines"
        icon={Newspaper}
        description={items.length > 0 ? `${items.length} stories` : undefined}
      >
        {items.length === 0 && <p className="ui-caption">No news available</p>}
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item, i) => (
            <li key={i} className="py-3 first:pt-0 last:pb-0">
              <a
                href={item.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group -mx-2 block rounded-lg px-2 py-1 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
              >
                <p className="flex items-start gap-2 text-sm font-medium text-gray-900 group-hover:text-brand-600 dark:text-white/90 dark:group-hover:text-brand-300">
                  <span className="min-w-0 flex-1">{item.title}</span>
                  <ExternalLink
                    size={14}
                    className="mt-1 shrink-0 text-gray-300 group-hover:text-brand-500 dark:text-gray-600"
                    aria-hidden="true"
                  />
                </p>
                {item.ai_summary ? (
                  <div className="mt-1.5 rounded-lg border-l-2 border-brand-500 bg-brand-50/60 px-3 py-2 dark:bg-brand-500/5">
                    <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      {item.ai_summary}
                    </p>
                  </div>
                ) : item.summary ? (
                  <p className="mt-1 line-clamp-3 text-xs text-gray-500 dark:text-gray-400">
                    {item.summary}
                  </p>
                ) : null}
                <p className="ui-caption mt-1.5">
                  {item.publisher}
                  {item.symbol && (
                    <>
                      {" · "}
                      <span className="font-medium text-gray-600 dark:text-gray-300">{item.symbol}</span>
                    </>
                  )}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </ChatCard>

      {aiTake && (
        <ChatCard
          title="AI's Take"
          icon={Sparkles}
          description={isStockTake ? "Moat · Buy or not · Financials" : undefined}
        >
          <div className="prose-news-summary text-sm text-gray-700 dark:text-gray-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiTake}</ReactMarkdown>
          </div>
        </ChatCard>
      )}
    </div>
  );
}
