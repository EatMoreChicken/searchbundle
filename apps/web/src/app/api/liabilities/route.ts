import { NextResponse } from "next/server";
import { getDb, debts } from "@searchbundle/db";
import { eq, and, isNull } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type DebtRow = typeof debts.$inferSelect;

function parseDebt(row: DebtRow) {
  return {
    ...row,
    balance: parseFloat(row.balance),
    originalBalance: row.originalBalance != null ? parseFloat(row.originalBalance) : null,
    interestRate: row.interestRate != null ? parseFloat(row.interestRate) : null,
    minimumPayment: row.minimumPayment != null ? parseFloat(row.minimumPayment) : null,
    escrowAmount: row.escrowAmount != null ? parseFloat(row.escrowAmount) : null,
    remainingMonths: row.remainingMonths != null ? parseInt(row.remainingMonths, 10) : null,
    homeValue: row.homeValue != null ? parseFloat(row.homeValue) : null,
    pmiMonthly: row.pmiMonthly != null ? parseFloat(row.pmiMonthly) : null,
    propertyTaxYearly: row.propertyTaxYearly != null ? parseFloat(row.propertyTaxYearly) : null,
    homeInsuranceYearly: row.homeInsuranceYearly != null ? parseFloat(row.homeInsuranceYearly) : null,
    loanTermMonths: row.loanTermMonths != null ? row.loanTermMonths : null,
    vehicleValue: row.vehicleValue != null ? parseFloat(row.vehicleValue) : null,
  };
}

export async function GET(request: Request) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "true";

  const conditions = [eq(debts.householdId, session.householdId)];
  if (!includeArchived) {
    conditions.push(isNull(debts.archivedAt));
  }

  const rows = await getDb()
    .select()
    .from(debts)
    .where(and(...conditions));

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
    escrowAmount, remainingMonths, notes, ownerId, interestAccrualMethod,
    homeValue, pmiMonthly, propertyTaxYearly, homeInsuranceYearly,
    loanStartDate, loanTermMonths, vehicleValue,
  } = body as Record<string, unknown>;

  if (!name || !type || balance === undefined) {
    return NextResponse.json(
      { message: "name, type, and balance are required" },
      { status: 400 }
    );
  }

  const [row] = await getDb()
    .insert(debts)
    .values({
      name: name as string,
      type: type as typeof debts.$inferInsert["type"],
      balance: String(balance),
      originalBalance: originalBalance != null ? String(originalBalance) : null,
      interestRate: interestRate != null ? String(interestRate) : null,
      minimumPayment: minimumPayment != null ? String(minimumPayment) : null,
      escrowAmount: escrowAmount != null ? String(escrowAmount) : null,
      remainingMonths: remainingMonths != null ? String(remainingMonths) : null,
      notes: (notes as string) || null,
      householdId: session.householdId,
      ownerId: (ownerId as string) ?? null,
      interestAccrualMethod: (interestAccrualMethod as typeof debts.$inferInsert["interestAccrualMethod"]) ?? null,
      homeValue: homeValue != null ? String(homeValue) : null,
      pmiMonthly: pmiMonthly != null ? String(pmiMonthly) : null,
      propertyTaxYearly: propertyTaxYearly != null ? String(propertyTaxYearly) : null,
      homeInsuranceYearly: homeInsuranceYearly != null ? String(homeInsuranceYearly) : null,
      loanStartDate: (loanStartDate as string) ?? null,
      loanTermMonths: loanTermMonths != null ? Number(loanTermMonths) : null,
      vehicleValue: vehicleValue != null ? String(vehicleValue) : null,
    })
    .returning();

  return NextResponse.json(parseDebt(row), { status: 201 });
}
