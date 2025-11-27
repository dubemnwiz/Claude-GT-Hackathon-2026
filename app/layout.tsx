import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal OS",
  description: "A one-stop shop for work and personal tracking",
};

import { NextAuthProvider } from "@/components/providers/NextAuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-primary/30">
            <Navbar />
            <main className="pt-20 px-6 max-w-7xl mx-auto h-full min-h-screen">
              {children}
            </main>
          </div>
        </NextAuthProvider>
      </body>
    </html>
  );
}
