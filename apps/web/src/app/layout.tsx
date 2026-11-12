import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import { Providers } from "@/components/Providers";

import "./globals.css";

// Be Vietnam Pro is designed for Vietnamese: diacritics (ă, ơ, ư, ệ…) sit well on every letter.
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Finance", template: "%s · Finance" },
  description: "Quản lý tài chính cá nhân",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
