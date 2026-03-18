import type { FastifyInstance } from "fastify";

export default async function accountRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    return reply.send([]);
  });

  app.post("/", async (request, reply) => {
    return reply.status(201).send({});
  });

  app.put("/:id", async (request, reply) => {
    return reply.send({});
  });

  app.delete("/:id", async (request, reply) => {
    return reply.status(204).send();
  });
}
