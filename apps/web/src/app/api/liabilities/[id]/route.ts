import { NextResponse } from "next/server";
import { getDb, debts } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type DebtRow = typeof debts.$inferSelect;

function parseDebt(row: DebtRow) {
  return {
    ...row,
    balance: parseFloat(row.balance),
    originalBalance: parseFloat(row.originalBalance),
    interestRate: parseFloat(row.interestRate),
    minimumPayment: parseFloat(row.minimumPayment),
    escrowAmount: row.escrowAmount != null ? parseFloat(row.escrowAmount) : null,
    remainingMonths: row.remainingMonths != null ? parseInt(row.remainingMonths, 10) : null,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;
  const [row] = await getDb()
    .select()
    .from(debts)
    .where(and(eq(debts.id, id), eq(debts.householdId, session.householdId)));

  if (!row) {
    return NextResponse.json({ message: "Liability not found" }, { status: 404 });
  }

  return NextResponse.json(parseDebt(row));
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

  const {
    name, type, balance, originalBalance, interestRate, minimumPayment,
    escrowAmount, remainingMonths, notes, ownerId,
  } = body as {
    name?: string;
    type?: string;
    balance?: unknown;
    originalBalance?: unknown;
    interestRate?: unknown;
    minimumPayment?: unknown;
    escrowAmount?: unknown;
    remainingMonths?: unknown;
    notes?: string;
    ownerId?: string | null;
  };

  const updates: Partial<typeof debts.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type as typeof debts.$inferInsert["type"];
  if (balance !== undefined) updates.balance = String(balance);
  if (originalBalance !== undefined) updates.originalBalance = String(originalBalance);
  if (interestRate !== undefined) updates.interestRate = String(interestRate);
  if (minimumPayment !== undefined) updates.minimumPayment = String(minimumPayment);
  if (escrowAmount !== undefined) updates.escrowAmount = escrowAmount != null ? String(escrowAmount) : null;
  if (remainingMonths !== undefined) updates.remainingMonths = remainingMonths != null ? String(remainingMonths) : null;
  if (notes !== undefined) updates.notes = notes;
  if (ownerId !== undefined) updates.ownerId = ownerId;

  const [row] = await getDb()
    .update(debts)
    .set(updates)
    .where(and(eq(debts.id, id), eq(debts.householdId, session.householdId)))
    .returning();

  if (!row) {
    return NextResponse.json({ message: "Liability not found" }, { status: 404 });
  }

  return NextResponse.json(parseDebt(row));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;
  await getDb()
    .delete(debts)
    .where(and(eq(debts.id, id), eq(debts.householdId, session.householdId)));

  return new NextResponse(null, { status: 204 });
}
