import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ParticleBackground } from "@/components/ui/ParticleBackground";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meridian",
  description: "Your personal life OS — journal, fitness, planning, and more.",
  appleWebApp: {
    capable: true,
    title: "Meridian",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0b0f1a" },
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <NextAuthProvider>
            <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 relative">
              <ParticleBackground />
              <main
                className="px-4 md:px-6 max-w-7xl mx-auto min-h-screen"
                style={{
                  paddingTop: "max(2rem, env(safe-area-inset-top, 0px))",
                  paddingBottom: "max(7rem, calc(5rem + env(safe-area-inset-bottom, 0px)))",
                }}
              >
                {children}
              </main>
              <Navbar />
            </div>
          </NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
