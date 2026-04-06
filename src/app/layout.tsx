import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import ThemeToggle from "@/components/common/ThemeToggle";
import Navigation from "@/components/common/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HJKS 停止情報ビューア",
  description: "発電所の停止情報を閲覧するためのビューア",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-[family-name:var(--font-geist-sans)]">
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  HJKS 停止情報ビューア
                </Link>
                <Navigation />
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <p>
              本サイトに掲載している停止情報は、
              <a href="https://hjks.jepx.or.jp/hjks/outages" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
                発電情報公開システム（HJKS）
              </a>
              より取得したデータに基づいています。
            </p>
            <p>
              本サイトの情報は参考目的で提供しており、正確性・完全性を保証するものではありません。
              データの取得・加工過程で誤りが生じる可能性があります。
              本サイトの情報に基づく判断・行動について、作成者は一切の責任を負いません。
            </p>
            <p>&copy; {new Date().getFullYear()} hama-jp. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
