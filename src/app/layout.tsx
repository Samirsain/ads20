import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaManager from "@/components/PwaManager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ads2Pub | Smart Traffic Monetization & Daily $15 Payouts",
  description:
    "Ads2Pub is a smart traffic monetization platform with next-day IST settlement and daily payouts starting at $15.",
  keywords: [
    "traffic monetization",
    "publisher network",
    "social media earnings",
    "daily payouts",
    "CPA network",
    "ads tracking",
  ],
  applicationName: "Ads2Pub",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ads2Pub",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
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
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-zinc-50 text-zinc-900 antialiased font-sans"
        suppressHydrationWarning
      >
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
