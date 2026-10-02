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
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--header)] backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-6">
                <Link
                  href="/"
                  className="group flex items-center gap-2.5 whitespace-nowrap"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105">
                    HJ
                  </span>
                  <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
                    停止情報ビューア
                  </span>
                </Link>
                <div className="hidden h-6 w-px bg-[var(--border)] sm:block" />
                <Navigation />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-[var(--border)]">
          <div className="mx-auto max-w-7xl px-4 py-8 text-xs leading-relaxed text-muted sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl space-y-2">
                <p>
                  本サイトに掲載している停止情報は、
                  <a
                    href="https://hjks.jepx.or.jp/hjks/outages"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-600 underline decoration-brand-300 underline-offset-2 transition-colors hover:text-brand-700 dark:text-brand-400"
                  >
                    発電情報公開システム（HJKS）
                  </a>
                  より取得したデータに基づいています。
                </p>
                <p className="text-subtle">
                  本サイトの情報は参考目的で提供しており、正確性・完全性を保証するものではありません。
                  データの取得・加工過程で誤りが生じる可能性があります。
                  本サイトの情報に基づく判断・行動について、作成者は一切の責任を負いません。
                </p>
              </div>
              <p className="shrink-0 text-subtle">
                &copy; {new Date().getFullYear()} hama-jp
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
