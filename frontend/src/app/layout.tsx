import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Analysis",
  description: "AI-powered stock research and portfolio insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex flex-1 flex-col lg:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 pb-[200px]">{children}</main>
        </div>
      </body>
    </html>
  );
}
