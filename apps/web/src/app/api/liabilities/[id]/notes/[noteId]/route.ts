import { NextResponse } from "next/server";
import { getDb, debts, debtNotes } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id, noteId } = await params;

  const [debt] = await getDb()
    .select({ id: debts.id })
    .from(debts)
    .where(and(eq(debts.id, id), eq(debts.householdId, session.householdId)));

  if (!debt) {
    return NextResponse.json({ message: "Liability not found" }, { status: 404 });
  }

  await getDb()
    .delete(debtNotes)
    .where(and(eq(debtNotes.id, noteId), eq(debtNotes.debtId, id)));

  return new NextResponse(null, { status: 204 });
}
