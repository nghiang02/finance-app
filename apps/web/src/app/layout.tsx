import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/Providers";

import "./globals.css";

// Inter ships a Vietnamese subset, so diacritics (ă, ơ, ư, ệ…) render in the same font.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Finance App",
  description: "Quản lý tài chính cá nhân",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
