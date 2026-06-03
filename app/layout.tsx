import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";

// Apple-style: jeden čistý sans (Geist ~ San Francisco) na všechno —
// text, nadpisy i čísla/stavy (zarovnání čísel přes tabular-nums).
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lead-gen & outreach",
  description: "Interní nástroj na vyhledávání a oslovování potenciálních klientů.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // dark-first: třída `dark` je natvrdo na <html>.
  return (
    <html
      lang="cs"
      className={`dark ${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader authEnabled={!!process.env.APP_PASSWORD} />
        <div className="flex flex-1 flex-col">{children}</div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
