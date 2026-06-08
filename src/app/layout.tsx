import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Ads2Pub | Smart Traffic Monetization & Weekly Payouts",
  description: "Ads2Pub is a smart traffic monetization platform connecting publishers to high-yielding campaigns. Track earnings real-time and get weekly payouts.",
  keywords: ["traffic monetization", "publisher network", "social media earnings", "weekly payouts", "CPA network", "ads tracking", "make money from facebook", "telegram monetization"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
