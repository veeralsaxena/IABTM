import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CURATE — Agentic Growth Curator for IABTM",
  description:
    "An agentic AI curator that optimizes media for human potential — not attention. Built for Hack Better Than Me.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable} h-full`}>
      <body className="relative min-h-full antialiased">{children}</body>
    </html>
  );
}
