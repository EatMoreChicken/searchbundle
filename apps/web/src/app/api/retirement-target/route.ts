import { NextResponse } from "next/server";
import { getDb, retirementTargets } from "@searchbundle/db";
import { eq } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type TargetRow = typeof retirementTargets.$inferSelect;

function parseTarget(row: TargetRow) {
  return {
    ...row,
    targetAmount: parseFloat(row.targetAmount),
    annualIncome: row.annualIncome != null ? parseFloat(row.annualIncome) : null,
    withdrawalRate: row.withdrawalRate != null ? parseFloat(row.withdrawalRate) : 0.04,
    expectedReturn: row.expectedReturn != null ? parseFloat(row.expectedReturn) : 0.07,
    inflationRate: row.inflationRate != null ? parseFloat(row.inflationRate) : 0.03,
  };
}

export async function GET() {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const [row] = await getDb()
    .select()
    .from(retirementTargets)
    .where(eq(retirementTargets.householdId, session.householdId));

  if (!row) {
    return NextResponse.json(null);
  }

  return NextResponse.json(parseTarget(row));
}

export async function PUT(request: Request) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const {
    mode, targetAmount, targetAge, annualIncome,
    withdrawalRate, expectedReturn, inflationRate, includeInflation,
  } = body as {
    mode?: string;
    targetAmount?: number;
    targetAge?: number;
    annualIncome?: number | null;
    withdrawalRate?: number;
    expectedReturn?: number;
    inflationRate?: number;
    includeInflation?: boolean;
  };

  if (!mode || !["fixed", "income_replacement"].includes(mode)) {
    return NextResponse.json({ message: "mode must be 'fixed' or 'income_replacement'" }, { status: 400 });
  }
  if (targetAmount == null || targetAmount <= 0) {
    return NextResponse.json({ message: "targetAmount must be a positive number" }, { status: 400 });
  }
  if (targetAge == null || targetAge < 1 || targetAge > 120) {
    return NextResponse.json({ message: "targetAge must be between 1 and 120" }, { status: 400 });
  }

  const [existing] = await getDb()
    .select({ id: retirementTargets.id })
    .from(retirementTargets)
    .where(eq(retirementTargets.householdId, session.householdId));

  const values = {
    mode: mode as "fixed" | "income_replacement",
    targetAmount: String(targetAmount),
    targetAge,
    annualIncome: annualIncome != null ? String(annualIncome) : null,
    withdrawalRate: withdrawalRate != null ? String(withdrawalRate) : "0.04",
    expectedReturn: expectedReturn != null ? String(expectedReturn) : "0.07",
    inflationRate: inflationRate != null ? String(inflationRate) : "0.03",
    includeInflation: includeInflation ?? false,
    updatedAt: new Date(),
  };

  let row: TargetRow;
  if (existing) {
    [row] = await getDb()
      .update(retirementTargets)
      .set(values)
      .where(eq(retirementTargets.householdId, session.householdId))
      .returning();
  } else {
    [row] = await getDb()
      .insert(retirementTargets)
      .values({ ...values, householdId: session.householdId })
      .returning();
  }

  return NextResponse.json(parseTarget(row));
}
