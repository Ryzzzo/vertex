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

export const metadata: Metadata = {
  metadataBase: new URL("https://vertexapps.dev"),
  title: "Vertex Business Solutions — One developer. Software that reads as a firm.",
  description:
    "One person carries your project from architecture to production — so nothing is lost between the person who heard you and the person who builds it.",
  openGraph: {
    title: "Vertex Business Solutions — One developer. Software that reads as a firm.",
    description:
      "One person carries your project from architecture to production — so nothing is lost between the person who heard you and the person who builds it.",
    url: "https://vertexapps.dev",
    siteName: "Vertex Business Solutions",
    type: "website",
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
