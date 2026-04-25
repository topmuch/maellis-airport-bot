import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Providers } from "@/components/providers";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  canonicalUrl,
} from "@/lib/seo";
import { JsonLdScript } from "@/components/JsonLdScript";

// ─── Fonts ─────────────────────────────────────────────────────────────────

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ─── Viewport ──────────────────────────────────────────────────────────────

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },
  ],
};

// ─── Root Metadata — Smartly Assistant Branding ───────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://smartly.aero";
const SITE_NAME = "Smartly Assistant";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'Smartly Assistant — L\'IA qui Transforme l\'Expérience Aéroportuaire',
    template: `%s | Smartly Assistant`,
  },
  description:
    "Smartly Assistant — L'IA WhatsApp qui transforme l'expérience aéroportuaire en Afrique. 40% de coûts support en moins, +15% de revenus annexes. Déployé en 7 jours.",
  keywords: [
    "Smartly Assistant",
    "assistant IA aéroport",
    "WhatsApp chatbot aéroport",
    "IA conversationnelle",
    "suivi de vols",
    "bagages intelligents",
    "marketplace aéroport",
    "salon VIP",
    "dashboard aéroport",
    "Sénégal",
    "Dakar",
    "Abidjan",
    "Afrique",
    "Orange Money",
    "Wave",
    "CinetPay",
    "facturation OHADA",
    "conciergerie hybride",
    "B2B aéroportuaire",
  ],
  authors: [{ name: "Smartly Team", url: SITE_URL }],
  creator: "Smartly Team",
  publisher: "Smartly Assistant",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
    shortcut: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
    apple: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  alternates: {
    canonical: canonicalUrl("/"),
    languages: {
      "fr-SN": canonicalUrl("/"),
      en: `${SITE_URL}/en`,
    },
  },

  openGraph: {
    type: "website",
    locale: "fr_SN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Smartly Assistant — IA WhatsApp Aéroport',
    description:
      "L'assistant IA WhatsApp qui transforme l'expérience aéroportuaire en Afrique. 40% de coûts en moins, 15% de revenus en plus. Déploiement 7 jours.",
    images: [
      {
        url: `${SITE_URL}/og?title=${encodeURIComponent("Smartly Assistant — IA WhatsApp Aéroport")}`,
        width: 1200,
        height: 630,
        alt: "Smartly Assistant — IA WhatsApp Aéroport",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | IA WhatsApp pour Aéroports`,
    description:
      "L'assistant IA WhatsApp pour aéroports africains. 40% de coûts en moins, 15% de revenus en plus.",
    images: [`${SITE_URL}/og`],
    creator: "@smartly_aero",
    site: "@smartly_aero",
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
};

// ─── Root Layout ───────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <JsonLdScript data={organizationJsonLd()} />
        <JsonLdScript data={softwareApplicationJsonLd()} />
        <link rel="preconnect" href="https://z-cdn.chatglm.cn" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://z-cdn.chatglm.cn" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <Providers>
            {children}
            <SonnerToaster duration={4000} richColors position="top-right" />
            <ShadcnToaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
