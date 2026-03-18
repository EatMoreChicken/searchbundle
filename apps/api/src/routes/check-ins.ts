import type { FastifyInstance } from "fastify";

export default async function checkInRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    return reply.send([]);
  });

  app.post("/", async (request, reply) => {
    return reply.status(201).send({});
  });
}
