import { NextResponse } from "next/server";
import { getDb, accounts, accountContributions } from "@searchbundle/db";
import { eq, and, asc } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type ContributionRow = typeof accountContributions.$inferSelect;

function parseContribution(row: ContributionRow) {
  return {
    ...row,
    amount: parseFloat(row.amount),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;

  const [asset] = await getDb()
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.householdId, session.householdId)));

  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const rows = await getDb()
    .select()
    .from(accountContributions)
    .where(eq(accountContributions.accountId, id))
    .orderBy(asc(accountContributions.createdAt));

  return NextResponse.json(rows.map(parseContribution));
}

const VALID_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;

  const [asset] = await getDb()
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.householdId, session.householdId)));

  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { label, amount, frequency = "monthly" } = body as {
    label?: string;
    amount?: unknown;
    frequency?: string;
  };

  if (!label || amount === undefined || amount === null) {
    return NextResponse.json({ message: "label and amount are required" }, { status: 400 });
  }

  if (!VALID_FREQUENCIES.includes(frequency)) {
    return NextResponse.json({ message: "Invalid frequency" }, { status: 400 });
  }

  const [row] = await getDb()
    .insert(accountContributions)
    .values({
      accountId: id,
      label,
      amount: String(amount),
      frequency: frequency as typeof accountContributions.$inferInsert["frequency"],
    })
    .returning();

  return NextResponse.json(parseContribution(row), { status: 201 });
}
