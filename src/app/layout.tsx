import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { PWAInitializer } from "@/components/pwa-initializer";

import "allotment/dist/style.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Polaris IDE",
    template: "%s | Polaris IDE"
  },
  description: "A powerful cloud IDE with AI assistance, built for modern development workflows",
  keywords: ["IDE", "Code Editor", "AI", "Collaboration", "Web Development"],
  authors: [{ name: "Polaris Team" }],
  creator: "Polaris Team",
  publisher: "Polaris",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    shortcut: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://polaris-ide.com",
    title: "Polaris IDE",
    description: "A powerful cloud IDE with AI assistance",
    siteName: "Polaris IDE",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Polaris IDE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Polaris IDE",
    description: "A powerful cloud IDE with AI assistance",
    creator: "@polaris_ide",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#0b1220" />
        <meta name="background-color" content="#0b1220" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Polaris" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Desktop PWA */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://api.polaris-ide.com" />
        
        {/* DNS Prefetching */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />
      </head>
      <body
        className={`${inter.variable} ${plexMono.variable} antialiased`}
        data-connection="online"
      >
        <Providers>
          {children}
          <PWAInitializer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
