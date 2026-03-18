import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import accountRoutes from "./routes/accounts.js";
import debtRoutes from "./routes/debts.js";
import checkInRoutes from "./routes/check-ins.js";

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: process.env.WEB_URL ?? "http://localhost:3000",
  credentials: true,
});

// Routes — each file handles one resource
server.register(accountRoutes, { prefix: "/api/accounts" });
server.register(debtRoutes, { prefix: "/api/debts" });
server.register(checkInRoutes, { prefix: "/api/check-ins" });

server.get("/api/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 3001);

try {
  await server.listen({ port, host: "0.0.0.0" });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
