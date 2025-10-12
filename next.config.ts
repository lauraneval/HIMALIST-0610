import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: ["cdn-eu.anidb.net"],
  },
};

export default nextConfig;
