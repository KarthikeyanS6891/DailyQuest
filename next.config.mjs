/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Pin the body size limit so Railway's reverse proxy and the Next.js
      // runtime agree on the cap for our auth + task form actions.
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
