import { NextResponse } from "next/server";
import { getDb, scenarios, debts } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type ScenarioRow = typeof scenarios.$inferSelect;

function parseScenario(row: ScenarioRow) {
  return {
    ...row,
    extraMonthlyPayment: row.extraMonthlyPayment != null ? parseFloat(row.extraMonthlyPayment) : 0,
    extraYearlyPayment: row.extraYearlyPayment != null ? parseFloat(row.extraYearlyPayment) : 0,
    lumpSumPayment: row.lumpSumPayment != null ? parseFloat(row.lumpSumPayment) : 0,
    lumpSumMonth: row.lumpSumMonth != null ? parseInt(row.lumpSumMonth, 10) : 1,
  };
}

export async function GET(
  _request: Request,
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

  const rows = await getDb()
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.debtId, id), eq(scenarios.householdId, session.householdId)));

  return NextResponse.json(rows.map(parseScenario));
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
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { name, extraMonthlyPayment, extraYearlyPayment, lumpSumPayment, lumpSumMonth } = body as {
    name?: string;
    extraMonthlyPayment?: unknown;
    extraYearlyPayment?: unknown;
    lumpSumPayment?: unknown;
    lumpSumMonth?: unknown;
  };

  if (!name) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  const [row] = await getDb()
    .insert(scenarios)
    .values({
      householdId: session.householdId,
      debtId: id,
      name,
      extraMonthlyPayment: extraMonthlyPayment != null ? String(extraMonthlyPayment) : "0",
      extraYearlyPayment: extraYearlyPayment != null ? String(extraYearlyPayment) : "0",
      lumpSumPayment: lumpSumPayment != null ? String(lumpSumPayment) : "0",
      lumpSumMonth: lumpSumMonth != null ? String(lumpSumMonth) : "1",
    })
    .returning();

  return NextResponse.json(parseScenario(row), { status: 201 });
}
