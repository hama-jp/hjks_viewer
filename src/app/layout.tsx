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

function AppMark() {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30 ring-1 ring-white/20">
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
      </svg>
    </span>
  );
}

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
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-5 lg:gap-8">
              <Link
                href="/"
                className="group flex shrink-0 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <AppMark />
                <span className="hidden flex-col leading-none sm:flex">
                  <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    HJKS
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    停止情報ビューア
                  </span>
                </span>
              </Link>
              <Navigation />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-slate-200/70 bg-white/60 dark:border-slate-800/70 dark:bg-slate-950/40">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-2.5">
                <AppMark />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    HJKS 停止情報ビューア
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    発電情報公開システムの停止情報を可視化
                  </p>
                </div>
              </div>
              <div className="max-w-2xl space-y-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <p>
                  本サイトに掲載している停止情報は、
                  <a
                    href="https://hjks.jepx.or.jp/hjks/outages"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                  >
                    発電情報公開システム（HJKS）
                  </a>
                  より取得したデータに基づいています。
                </p>
                <p>
                  本サイトの情報は参考目的で提供しており、正確性・完全性を保証するものではありません。
                  データの取得・加工過程で誤りが生じる可能性があります。本サイトの情報に基づく判断・行動について、作成者は一切の責任を負いません。
                </p>
                <p className="pt-1 text-slate-400 dark:text-slate-500">
                  &copy; {new Date().getFullYear()} hama-jp. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}