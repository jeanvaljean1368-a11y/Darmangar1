import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

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
  icons: {
    icon: "/darmanegar-logo.png",
  },
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
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
