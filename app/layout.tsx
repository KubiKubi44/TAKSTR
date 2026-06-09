import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// Apple-style: jeden čistý sans (Geist ~ San Francisco) na všechno —
// text, nadpisy i čísla/stavy (zarovnání čísel přes tabular-nums).
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TAK - Dashboard",
  description: "Interní nástroj studia — leady, projekty, finance, kalendář.",
  // iOS: běh na celou obrazovku po „Přidat na plochu"
  appleWebApp: {
    capable: true,
    title: "TAK",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // pod notch na iPhonu
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Téma řídí next-themes (třída light/dark na <html>); default tmavý.
  return (
    <html
      lang="cs"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader authEnabled={!!process.env.APP_PASSWORD} />
          <div className="flex flex-1 flex-col">{children}</div>
          <Toaster position="bottom-right" />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
