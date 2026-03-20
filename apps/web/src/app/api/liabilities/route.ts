import { NextResponse } from "next/server";
import { getDb, debts } from "@searchbundle/db";
import { eq } from "drizzle-orm";
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

export async function GET() {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const rows = await getDb()
    .select()
    .from(debts)
    .where(eq(debts.householdId, session.householdId));

  return NextResponse.json(rows.map(parseDebt));
}

export async function POST(request: Request) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

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

  if (!name || !type || balance === undefined || originalBalance === undefined || interestRate === undefined || minimumPayment === undefined) {
    return NextResponse.json(
      { message: "name, type, balance, originalBalance, interestRate, and minimumPayment are required" },
      { status: 400 }
    );
  }

  const [row] = await getDb()
    .insert(debts)
    .values({
      name,
      type: type as typeof debts.$inferInsert["type"],
      balance: String(balance),
      originalBalance: String(originalBalance),
      interestRate: String(interestRate),
      minimumPayment: String(minimumPayment),
      escrowAmount: escrowAmount != null ? String(escrowAmount) : null,
      remainingMonths: remainingMonths != null ? String(remainingMonths) : null,
      notes: notes || null,
      householdId: session.householdId,
      ownerId: ownerId ?? null,
    })
    .returning();

  return NextResponse.json(parseDebt(row), { status: 201 });
}
