import { NextResponse } from "next/server";
import { getDb, accounts, balanceUpdates } from "@searchbundle/db";
import { eq, and, desc } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type BalanceUpdateRow = typeof balanceUpdates.$inferSelect;

function parseBalanceUpdate(row: BalanceUpdateRow) {
  return {
    ...row,
    previousBalance: parseFloat(row.previousBalance),
    newBalance: parseFloat(row.newBalance),
    changeAmount: parseFloat(row.changeAmount),
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
    .from(balanceUpdates)
    .where(eq(balanceUpdates.accountId, id))
    .orderBy(desc(balanceUpdates.createdAt));

  return NextResponse.json(rows.map(parseBalanceUpdate));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;

  const [asset] = await getDb()
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.householdId, session.householdId)));

  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.newBalance === undefined) {
    return NextResponse.json({ message: "newBalance is required" }, { status: 400 });
  }

  const previousBalance = parseFloat(asset.balance);
  const newBalance = parseFloat(String(body.newBalance));

  if (isNaN(newBalance)) {
    return NextResponse.json({ message: "newBalance must be a number" }, { status: 400 });
  }

  const changeAmount = newBalance - previousBalance;
  const note = typeof body.note === "string" ? body.note || null : null;

  const db = getDb();

  const [updateRow] = await db
    .insert(balanceUpdates)
    .values({
      accountId: id,
      previousBalance: String(previousBalance),
      newBalance: String(newBalance),
      changeAmount: String(changeAmount),
      note,
    })
    .returning();

  await db
    .update(accounts)
    .set({ balance: String(newBalance), updatedAt: new Date() })
    .where(eq(accounts.id, id));

  return NextResponse.json(parseBalanceUpdate(updateRow), { status: 201 });
}
