import type { Metadata } from "next";
import {
  Inter,
  Instrument_Sans,
  Instrument_Serif,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import Assistant from "@/components/Assistant";
import Spotlight from "@/components/Spotlight";

/**
 * Inter stays on body copy, where it is a genuinely good text face. Display
 * type moved off it: at headline sizes Inter is the default every SaaS template
 * ships with, and the whole argument of this site is that it was not assembled
 * from a template. Instrument Sans carries a little more character in the
 * counters and a narrower cap, which reads as drawn rather than defaulted.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  axes: ["opsz"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

/** Held for editorial moments — currently the hero's one italic phrase. */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
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
      className={`${inter.variable} ${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {children}
        <Assistant />
        <Spotlight />
        {/* Film grain: a static noise field at 3.5%, so large dark surfaces
            stop banding and read as material rather than flat colour. */}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
