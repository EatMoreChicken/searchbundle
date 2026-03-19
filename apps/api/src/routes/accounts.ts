import type { FastifyInstance } from "fastify";
import { getDb, accounts } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";

const FIXTURE_USER_ID = "00000000-0000-0000-0000-000000000001";

type AccountType = "investment" | "savings" | "property" | "other";

interface AccountBody {
  name: string;
  type: AccountType;
  balance: string;
  currency?: string;
  notes?: string;
}

function parseAccount(row: typeof accounts.$inferSelect) {
  return {
    ...row,
    balance: parseFloat(row.balance),
  };
}

export default async function accountRoutes(app: FastifyInstance) {
  app.get("/", async (_request, reply) => {
    const rows = await getDb()
      .select()
      .from(accounts)
      .where(eq(accounts.userId, FIXTURE_USER_ID));
    return reply.send(rows.map(parseAccount));
  });

  app.post<{ Body: AccountBody }>("/", async (request, reply) => {
    const { name, type, balance, currency = "USD", notes } = request.body;

    if (!name || !type || balance === undefined) {
      return reply.status(400).send({ message: "name, type, and balance are required" });
    }

    const [row] = await getDb()
      .insert(accounts)
      .values({ name, type, balance, currency, notes, userId: FIXTURE_USER_ID })
      .returning();

    return reply.status(201).send(parseAccount(row));
  });

  app.put<{ Params: { id: string }; Body: Partial<AccountBody> }>(
    "/:id",
    async (request, reply) => {
      const { id } = request.params;
      const { name, type, balance, currency, notes } = request.body;

      const updates: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (type !== undefined) updates.type = type;
      if (balance !== undefined) updates.balance = balance;
      if (currency !== undefined) updates.currency = currency;
      if (notes !== undefined) updates.notes = notes;

      const [row] = await getDb()
        .update(accounts)
        .set(updates)
        .where(and(eq(accounts.id, id), eq(accounts.userId, FIXTURE_USER_ID)))
        .returning();

      if (!row) return reply.status(404).send({ message: "Account not found" });
      return reply.send(parseAccount(row));
    }
  );

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params;
    await getDb()
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, FIXTURE_USER_ID)));
    return reply.status(204).send();
  });
}

