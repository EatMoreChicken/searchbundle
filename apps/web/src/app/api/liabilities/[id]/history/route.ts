import { NextResponse } from "next/server";
import { getDb, debts, debtBalanceUpdates } from "@searchbundle/db";
import { eq, and, desc } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;

  const [debt] = await getDb()
    .select({ id: debts.id })
    .from(debts)
    .where(and(eq(debts.id, id), eq(debts.householdId, session.householdId)));

  if (!debt) {
    return NextResponse.json({ message: "Liability not found" }, { status: 404 });
  }

  const rows = await getDb()
    .select()
    .from(debtBalanceUpdates)
    .where(eq(debtBalanceUpdates.debtId, id))
    .orderBy(desc(debtBalanceUpdates.createdAt));

  const parsed = rows.map((r) => ({
    ...r,
    previousBalance: parseFloat(r.previousBalance),
    newBalance: parseFloat(r.newBalance),
    changeAmount: parseFloat(r.changeAmount),
  }));

  return NextResponse.json(parsed);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;

  const [debt] = await getDb()
    .select()
    .from(debts)
    .where(and(eq(debts.id, id), eq(debts.householdId, session.householdId)));

  if (!debt) {
    return NextResponse.json({ message: "Liability not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.newBalance === undefined) {
    return NextResponse.json({ message: "newBalance is required" }, { status: 400 });
  }

  const previousBalance = parseFloat(debt.balance);
  const newBalance = Number(body.newBalance);
  const changeAmount = newBalance - previousBalance;

  const db = getDb();

  const [update] = await db
    .insert(debtBalanceUpdates)
    .values({
      debtId: id,
      previousBalance: String(previousBalance),
      newBalance: String(newBalance),
      changeAmount: String(changeAmount),
      note: body.note || null,
    })
    .returning();

  await db
    .update(debts)
    .set({ balance: String(newBalance), updatedAt: new Date() })
    .where(eq(debts.id, id));

  return NextResponse.json({
    ...update,
    previousBalance: parseFloat(update.previousBalance),
    newBalance: parseFloat(update.newBalance),
    changeAmount: parseFloat(update.changeAmount),
  }, { status: 201 });
}
