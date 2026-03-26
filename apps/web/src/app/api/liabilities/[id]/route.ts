import { NextResponse } from "next/server";
import { getDb, debts } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
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
    escrowAmount, remainingMonths, notes, ownerId, interestAccrualMethod,
    homeValue, pmiMonthly, propertyTaxYearly, homeInsuranceYearly,
    loanStartDate, loanTermMonths, vehicleValue, archivedAt,
  } = body as Record<string, unknown>;

  const updates: Partial<typeof debts.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name as string;
  if (type !== undefined) updates.type = type as typeof debts.$inferInsert["type"];
  if (balance !== undefined) updates.balance = String(balance);
  if (originalBalance !== undefined) updates.originalBalance = originalBalance != null ? String(originalBalance) : null;
  if (interestRate !== undefined) updates.interestRate = interestRate != null ? String(interestRate) : null;
  if (minimumPayment !== undefined) updates.minimumPayment = minimumPayment != null ? String(minimumPayment) : null;
  if (escrowAmount !== undefined) updates.escrowAmount = escrowAmount != null ? String(escrowAmount) : null;
  if (remainingMonths !== undefined) updates.remainingMonths = remainingMonths != null ? String(remainingMonths) : null;
  if (notes !== undefined) updates.notes = notes as string;
  if (ownerId !== undefined) updates.ownerId = ownerId as string;
  if (interestAccrualMethod !== undefined) updates.interestAccrualMethod = (interestAccrualMethod as typeof debts.$inferInsert["interestAccrualMethod"]) ?? null;
  if (homeValue !== undefined) updates.homeValue = homeValue != null ? String(homeValue) : null;
  if (pmiMonthly !== undefined) updates.pmiMonthly = pmiMonthly != null ? String(pmiMonthly) : null;
  if (propertyTaxYearly !== undefined) updates.propertyTaxYearly = propertyTaxYearly != null ? String(propertyTaxYearly) : null;
  if (homeInsuranceYearly !== undefined) updates.homeInsuranceYearly = homeInsuranceYearly != null ? String(homeInsuranceYearly) : null;
  if (loanStartDate !== undefined) updates.loanStartDate = (loanStartDate as string) ?? null;
  if (loanTermMonths !== undefined) updates.loanTermMonths = loanTermMonths != null ? Number(loanTermMonths) : null;
  if (vehicleValue !== undefined) updates.vehicleValue = vehicleValue != null ? String(vehicleValue) : null;
  if (archivedAt !== undefined) updates.archivedAt = archivedAt ? new Date(archivedAt as string) : null;

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
