import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
  remotePatterns: [
    { protocol: "https", hostname: "i.imgur.com" },
    { protocol: "https", hostname: "cdn.myanimelist.net" },
    { protocol: "https", hostname: "cdn-eu.anidb.net" },
    { protocol: "https", hostname: "wallpapercave.com" },
  ],
},
};

export default nextConfig;
