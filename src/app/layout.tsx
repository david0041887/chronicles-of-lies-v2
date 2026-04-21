import type { Metadata } from "next";
import { Noto_Serif_TC, Noto_Sans_TC, Cinzel } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const notoSerifTC = Noto_Serif_TC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "謊言編年者 Chronicles of Lies",
  description:
    "在帷幕撕裂之前,決定誰是神。卡牌對戰 RPG —— 穿越 15 個歷史時代,改寫人類信仰。",
  openGraph: {
    title: "謊言編年者 Chronicles of Lies",
    description: "你相信的一切,可能都是你自己造成的。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${notoSerifTC.variable} ${notoSansTC.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
