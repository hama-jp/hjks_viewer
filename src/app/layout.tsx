import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-[family-name:var(--font-geist-sans)]">
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-lg font-bold text-blue-700">
                  HJKS 停止情報ビューア
                </Link>
                <nav className="hidden sm:flex items-center gap-6">
                  <Link
                    href="/"
                    className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
                  >
                    ダッシュボード
                  </Link>
                  <Link
                    href="/timeline"
                    className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
                  >
                    タイムライン
                  </Link>
                  <Link
                    href="/outages"
                    className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
                  >
                    停止情報一覧
                  </Link>
                </nav>
              </div>
              {/* Mobile nav */}
              <nav className="flex sm:hidden items-center gap-4">
                <Link
                  href="/"
                  className="text-sm font-medium text-slate-600 hover:text-blue-700"
                >
                  ダッシュボード
                </Link>
                <Link
                  href="/timeline"
                  className="text-sm font-medium text-slate-600 hover:text-blue-700"
                >
                  タイムライン
                </Link>
                <Link
                  href="/outages"
                  className="text-sm font-medium text-slate-600 hover:text-blue-700"
                >
                  一覧
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white mt-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-xs text-slate-500 space-y-2">
            <p>
              本サイトに掲載している停止情報は、
              <a href="https://hjks.jepx.or.jp/hjks/outages" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline">
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
