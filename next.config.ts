import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // The ship concept moved out of this repo (C:\DEVELOPMENT\Concepts\vertex-ship).
  // Anyone holding an old /ship link lands on the site rather than a 404.
  async redirects() {
    return [
      { source: "/ship", destination: "/", permanent: true },
      { source: "/ship/:path*", destination: "/", permanent: true },
      { source: "/legal/credits", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
