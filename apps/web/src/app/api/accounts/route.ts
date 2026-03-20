import { NextResponse } from "next/server";
import { getDb, accounts } from "@searchbundle/db";
import { eq } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type AccountRow = typeof accounts.$inferSelect;

function parseAccount(row: AccountRow) {
  return { ...row, balance: parseFloat(row.balance) };
}

export async function GET() {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const rows = await getDb()
    .select()
    .from(accounts)
    .where(eq(accounts.householdId, session.householdId));

  return NextResponse.json(rows.map(parseAccount));
}

export async function POST(request: Request) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { name, type, balance, currency = "USD", notes, ownerId } = body as {
    name?: string;
    type?: string;
    balance?: unknown;
    currency?: string;
    notes?: string;
    ownerId?: string | null;
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
      householdId: session.householdId,
      ownerId: ownerId ?? null,
    })
    .returning();

  return NextResponse.json(parseAccount(row), { status: 201 });
}
