import { NextResponse } from "next/server";
import { getDb, debts, debtNotes } from "@searchbundle/db";
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
    .from(debtNotes)
    .where(eq(debtNotes.debtId, id))
    .orderBy(desc(debtNotes.createdAt));

  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => null);
  if (!body || !body.content?.trim()) {
    return NextResponse.json({ message: "content is required" }, { status: 400 });
  }

  const [row] = await getDb()
    .insert(debtNotes)
    .values({
      debtId: id,
      householdId: session.householdId,
      content: body.content.trim(),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
