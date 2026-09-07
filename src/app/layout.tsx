import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DevFolio — Turn GitHub into a hireable portfolio",
  description:
    "Sign in with GitHub, generate AI summaries for every repo with Gemini, and publish a clean shareable portfolio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
