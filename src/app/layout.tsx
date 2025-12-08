import type { Metadata } from "next";
import { Geist, Geist_Mono, Zen_Maru_Gothic, Klee_One } from "next/font/google";
import { APP_CONFIG } from "@/config/app";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const zenMaruGothic = Zen_Maru_Gothic({
  weight: ["300", "400", "500"],
  variable: "--font-zen-maru",
  subsets: ["latin"],
});

const kleeOne = Klee_One({
  weight: ["400", "600"],
  variable: "--font-klee",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${zenMaruGothic.variable} ${kleeOne.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
