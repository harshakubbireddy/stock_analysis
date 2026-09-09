"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChartCandlestick,
  Landmark,
  LayoutDashboard,
  Menu,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/smart-money", label: "Smart Money", icon: Landmark },
  { href: "/ai-analysis", label: "AI Analysis", icon: Sparkles },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-16 items-center gap-3 border-b border-gray-200 px-6 dark:border-gray-800"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white">
          <ChartCandlestick size={20} aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold text-gray-900 dark:text-white/90">
          Stock Analysis
        </span>
      </Link>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-4">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Menu
        </p>
        <ul className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <span className="text-base font-semibold text-gray-900 dark:text-white/90">
          Stock Analysis
        </span>
      </header>

      <aside className="sticky top-0 hidden h-screen w-[290px] shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:block">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={close}
            className="absolute inset-0 bg-gray-900/50 transition-opacity"
          />
          <aside className="relative z-10 h-full w-[290px] border-r border-gray-200 bg-white shadow-theme-md dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={close}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <SidebarContent onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  );
}
