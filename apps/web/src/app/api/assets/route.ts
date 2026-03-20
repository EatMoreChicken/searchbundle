import { NextResponse } from "next/server";
import { getDb, accounts } from "@searchbundle/db";
import { eq } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type AccountRow = typeof accounts.$inferSelect;

function parseAsset(row: AccountRow) {
  return {
    ...row,
    balance: parseFloat(row.balance),
    contributionAmount: row.contributionAmount != null ? parseFloat(row.contributionAmount) : null,
    returnRate: row.returnRate != null ? parseFloat(row.returnRate) : null,
    returnRateVariance: row.returnRateVariance != null ? parseFloat(row.returnRateVariance) : null,
  };
}

export async function GET() {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const rows = await getDb()
    .select()
    .from(accounts)
    .where(eq(accounts.householdId, session.householdId));

  return NextResponse.json(rows.map(parseAsset));
}

export async function POST(request: Request) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const {
    name, type, balance, currency = "USD", notes, ownerId,
    contributionAmount, contributionFrequency, returnRate, returnRateVariance, includeInflation,
  } = body as {
    name?: string;
    type?: string;
    balance?: unknown;
    currency?: string;
    notes?: string;
    ownerId?: string | null;
    contributionAmount?: unknown;
    contributionFrequency?: string;
    returnRate?: unknown;
    returnRateVariance?: unknown;
    includeInflation?: boolean;
  };

  if (!name || !type || balance === undefined) {
    return NextResponse.json(
      { message: "name, type, and balance are required" },
      { status: 400 }
    );
  }

  const [row] = await getDb()
    .insert(accounts)
    .values({
      name,
      type: type as typeof accounts.$inferInsert["type"],
      balance: String(balance),
      currency,
      notes,
      contributionAmount: contributionAmount != null ? String(contributionAmount) : null,
      contributionFrequency: (contributionFrequency ?? null) as typeof accounts.$inferInsert["contributionFrequency"],
      returnRate: returnRate != null ? String(returnRate) : null,
      returnRateVariance: returnRateVariance != null ? String(returnRateVariance) : null,
      includeInflation: includeInflation ?? false,
      householdId: session.householdId,
      ownerId: ownerId ?? null,
    })
    .returning();

  return NextResponse.json(parseAsset(row), { status: 201 });
}
