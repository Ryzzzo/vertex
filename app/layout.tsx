import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Assistant from "@/components/Assistant";

/**
 * "Inter Display" is not published as its own Google Fonts family — Inter's
 * variable font carries the display cut on its optical-size axis. Loading it
 * once and aliasing --font-display to it in globals.css avoids shipping a
 * duplicate @font-face set for what is the same file.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const title =
  "Vertex Business Solutions — One developer. Software that reads as a firm.";
const description =
  "One person carries your project from architecture to production — so nothing is lost between the person who heard you and the person who builds it.";

/** Authored at 1200×627; declared so crawlers lay the card out before the fetch resolves. */
const ogImage = {
  url: "/og.png",
  width: 1200,
  height: 627,
  alt: "Vertex Business Solutions — the VX mark on a near-black field.",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://vertexapps.dev"),
  title,
  description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: {
    title,
    description,
    url: "https://vertexapps.dev",
    siteName: "Vertex Business Solutions",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {children}
        <Assistant />
      </body>
    </html>
  );
}
