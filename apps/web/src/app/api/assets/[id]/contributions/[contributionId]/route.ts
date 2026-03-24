import { NextResponse } from "next/server";
import { getDb, accounts, accountContributions } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

type ContributionRow = typeof accountContributions.$inferSelect;

function parseContribution(row: ContributionRow) {
  return {
    ...row,
    amount: parseFloat(row.amount),
  };
}

const VALID_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; contributionId: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id, contributionId } = await params;

  const [asset] = await getDb()
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.householdId, session.householdId)));

  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { label, amount, frequency } = body as {
    label?: string;
    amount?: unknown;
    frequency?: string;
  };

  const updates: Partial<typeof accountContributions.$inferInsert> = {};
  if (label !== undefined) updates.label = label;
  if (amount !== undefined) updates.amount = String(amount);
  if (frequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(frequency)) {
      return NextResponse.json({ message: "Invalid frequency" }, { status: 400 });
    }
    updates.frequency = frequency as typeof accountContributions.$inferInsert["frequency"];
  }

  const [row] = await getDb()
    .update(accountContributions)
    .set(updates)
    .where(
      and(
        eq(accountContributions.id, contributionId),
        eq(accountContributions.accountId, id)
      )
    )
    .returning();

  if (!row) {
    return NextResponse.json({ message: "Contribution not found" }, { status: 404 });
  }

  return NextResponse.json(parseContribution(row));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contributionId: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id, contributionId } = await params;

  const [asset] = await getDb()
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.householdId, session.householdId)));

  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  await getDb()
    .delete(accountContributions)
    .where(
      and(
        eq(accountContributions.id, contributionId),
        eq(accountContributions.accountId, id)
      )
    );

  return new NextResponse(null, { status: 204 });
}
