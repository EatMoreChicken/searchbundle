import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The API runs as a separate Fastify server.
  // All /api/* requests are proxied to it in development.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
