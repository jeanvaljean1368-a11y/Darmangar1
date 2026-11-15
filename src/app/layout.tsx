import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/darmanegar/PWARegister";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "درمانگر | پلتفرم خدمات سلامت ایران",
  description: "اپلیکیشن درمانگر - درخواست و ارائه خدمات پرستاری، کمک‌پرستاری، ماساژ درمانی و فیزیوتراپی در سراسر ایران",
  keywords: ["درمانگر", "پرستاری", "کمک پرستاری", "ماساژ درمانی", "فیزیوتراپی", "خدمات سلامت", "ایران"],
  authors: [{ name: "درمانگر" }],
  applicationName: "درمانگر",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "درمانگر",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/darmanegar-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/darmanegar-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/darmanegar-logo.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
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
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <PWARegister />
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
