import type { FastifyInstance } from "fastify";
import { getDb, accounts } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";

const FIXTURE_HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000010";

type AssetType = "investment" | "savings" | "hsa" | "property" | "other";
type ContributionFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

interface AssetBody {
  name: string;
  type: AssetType;
  balance: string;
  currency?: string;
  notes?: string;
  contributionAmount?: string | null;
  contributionFrequency?: ContributionFrequency | null;
  returnRate?: string | null;
  returnRateVariance?: string | null;
  includeInflation?: boolean;
}

function parseAsset(row: typeof accounts.$inferSelect) {
  return {
    ...row,
    balance: parseFloat(row.balance),
    contributionAmount: row.contributionAmount != null ? parseFloat(row.contributionAmount) : null,
    returnRate: row.returnRate != null ? parseFloat(row.returnRate) : null,
    returnRateVariance: row.returnRateVariance != null ? parseFloat(row.returnRateVariance) : null,
  };
}

export default async function assetRoutes(app: FastifyInstance) {
  app.get("/", async (_request, reply) => {
    const rows = await getDb()
      .select()
      .from(accounts)
      .where(eq(accounts.householdId, FIXTURE_HOUSEHOLD_ID));
    return reply.send(rows.map(parseAsset));
  });

  app.post<{ Body: AssetBody }>("/", async (request, reply) => {
    const {
      name, type, balance, currency = "USD", notes,
      contributionAmount, contributionFrequency, returnRate, returnRateVariance, includeInflation = false,
    } = request.body;

    if (!name || !type || balance === undefined) {
      return reply.status(400).send({ message: "name, type, and balance are required" });
    }

    const [row] = await getDb()
      .insert(accounts)
      .values({
        name, type, balance, currency, notes,
        contributionAmount: contributionAmount ?? null,
        contributionFrequency: contributionFrequency ?? null,
        returnRate: returnRate ?? null,
        returnRateVariance: returnRateVariance ?? null,
        includeInflation,
        householdId: FIXTURE_HOUSEHOLD_ID,
      })
      .returning();

    return reply.status(201).send(parseAsset(row));
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params;
    const [row] = await getDb()
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.householdId, FIXTURE_HOUSEHOLD_ID)));
    if (!row) return reply.status(404).send({ message: "Asset not found" });
    return reply.send(parseAsset(row));
  });

  app.put<{ Params: { id: string }; Body: Partial<AssetBody> }>(
    "/:id",
    async (request, reply) => {
      const { id } = request.params;
      const {
        name, type, balance, currency, notes,
        contributionAmount, contributionFrequency, returnRate, returnRateVariance, includeInflation,
      } = request.body;

      const updates: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (type !== undefined) updates.type = type;
      if (balance !== undefined) updates.balance = balance;
      if (currency !== undefined) updates.currency = currency;
      if (notes !== undefined) updates.notes = notes;
      if (contributionAmount !== undefined) updates.contributionAmount = contributionAmount ?? null;
      if (contributionFrequency !== undefined) updates.contributionFrequency = contributionFrequency ?? null;
      if (returnRate !== undefined) updates.returnRate = returnRate ?? null;
      if (returnRateVariance !== undefined) updates.returnRateVariance = returnRateVariance ?? null;
      if (includeInflation !== undefined) updates.includeInflation = includeInflation;

      const [row] = await getDb()
        .update(accounts)
        .set(updates)
        .where(and(eq(accounts.id, id), eq(accounts.householdId, FIXTURE_HOUSEHOLD_ID)))
        .returning();

      if (!row) return reply.status(404).send({ message: "Asset not found" });
      return reply.send(parseAsset(row));
    }
  );

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params;
    await getDb()
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.householdId, FIXTURE_HOUSEHOLD_ID)));
    return reply.status(204).send();
  });
}

