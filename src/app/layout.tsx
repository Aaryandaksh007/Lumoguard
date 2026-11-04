import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "LoomGuard — Pre-Publication Brand Governance",
  description:
    "Two-stage hybrid verification for brand terminology, tone, factual claims, visual consistency, WCAG 2.2 accessibility, and confidentiality — with intent-preserving surgical diffs, full AI provenance tracing, and a Guideline Ambiguity Score engine.",
  keywords: [
    "brand governance",
    "pre-publication compliance",
    "WCAG 2.2",
    "CIEDE2000",
    "claim substantiation",
    "FTC compliance",
    "brand consistency",
    "LoomGuard",
  ],
  authors: [{ name: "LoomGuard" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "LoomGuard — Pre-Publication Brand Governance",
    description:
      "Deterministic + AI hybrid verification across six governance pillars with surgical diffs and provenance tracing.",
    siteName: "LoomGuard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
