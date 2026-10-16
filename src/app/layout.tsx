import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/Navbar";
import { getSessionUser } from "@/lib/auth";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", weight: ["400", "500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SatyaCheck — AI Deepfake Detection & Digital Trust for India",
  description: "Verify images, videos, voices and viral messages for AI manipulation. Forensic-grade trust scores, PDF evidence reports, in English and Hindi.",
  applicationName: "SatyaCheck",
};

export const viewport: Viewport = {
  themeColor: "#050a1c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-navy-950 font-body antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-electric-500 focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <Providers>
          <Navbar user={user} />
          <main id="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
