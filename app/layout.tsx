import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavHeader } from "@/components/nav-header";
import { DemoProvider } from "@/lib/demo-store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TripIntent — Agentic Travel Recovery",
  description:
    "An outcome-first travel recovery agent built for the Alibaba Cloud × Atlas × Qoder Agentic AI Hackathon 2026, using Atlas Sandbox for flight discovery and fare verification.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] selection:bg-primary/20">
        <DemoProvider>
          <NavHeader />
          {children}
          <footer className="mt-auto border-t border-border/50 pb-8 pt-10 text-center text-[11px] text-muted-foreground sm:py-12">
            <p className="font-semibold text-foreground">TripIntent</p>
            <p className="mt-1">Built for Alibaba Cloud × Atlas × Qoder Agentic AI Hackathon 2026</p>
            <p className="mt-1.5">Atlas Sandbox &middot; Built with Qoder</p>
          </footer>
        </DemoProvider>
      </body>
    </html>
  );
}
