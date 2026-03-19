import { config } from "dotenv";
import { resolve, dirname } from "path";
import type { NextConfig } from "next";

config({ path: resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  // fallback: Only unmatched /api/* paths proxy to Fastify.
  // Next.js route handlers (/api/auth/*, /api/accounts, /api/users) resolve first.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: "/api/:path*",
          destination: "http://localhost:3001/api/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
