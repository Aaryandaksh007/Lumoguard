import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "LoomGuard — The Fabric of Trust",
  description:
    "A governance film in three acts, then the machine itself: two-stage hybrid verification (deterministic engines + semantic AI behind a reversible confidentiality shield), six governance pillars, intent-preserving surgical diffs, full AI provenance tracing, and a Guideline Ambiguity Score engine.",
  keywords: [
    "brand governance",
    "pre-publication compliance",
    "WCAG 2.2",
    "CIEDE2000",
    "claim substantiation",
    "brand consistency",
    "LoomGuard",
  ],
  authors: [{ name: "LoomGuard" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "LoomGuard — The Fabric of Trust",
    description:
      "Every brand is a fabric. One thread can unravel it. Deterministic × Semantic × Human — woven into one gate before anything ships.",
    siteName: "LoomGuard",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
