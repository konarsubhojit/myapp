import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ThemeRegistry from "@/lib/ThemeRegistry";
import SessionProvider from "@/components/SessionProvider";
import QueryProvider from "@/components/QueryProvider";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kiyon Store - Order Management System",
  description: "A comprehensive order management system for managing orders, items, and customer feedback",
  keywords: ["order management", "inventory", "sales", "analytics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <SessionProvider>
          <QueryProvider>
            <ThemeRegistry>
              <NotificationProvider>
                <CurrencyProvider>
                  {children}
                  <Analytics />
                  <SpeedInsights />
                </CurrencyProvider>
              </NotificationProvider>
            </ThemeRegistry>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
