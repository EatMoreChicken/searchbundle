import { NextResponse } from "next/server";
import { getDb, accounts } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type AccountRow = typeof accounts.$inferSelect;

function parseAccount(row: AccountRow) {
  return { ...row, balance: parseFloat(row.balance) };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { name, type, balance, currency, notes, ownerId } = body as {
    name?: string;
    type?: string;
    balance?: unknown;
    currency?: string;
    notes?: string;
    ownerId?: string | null;
  };

  const updates: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type as typeof accounts.$inferInsert["type"];
  if (balance !== undefined) updates.balance = String(balance);
  if (currency !== undefined) updates.currency = currency;
  if (notes !== undefined) updates.notes = notes;
  if (ownerId !== undefined) updates.ownerId = ownerId;

  const [row] = await getDb()
    .update(accounts)
    .set(updates)
    .where(and(eq(accounts.id, id), eq(accounts.householdId, session.householdId)))
    .returning();

  if (!row) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(parseAccount(row));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;

  await getDb()
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.householdId, session.householdId)));

  return new NextResponse(null, { status: 204 });
}
