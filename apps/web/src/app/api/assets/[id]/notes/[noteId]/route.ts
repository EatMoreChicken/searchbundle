import { NextResponse } from "next/server";
import { getDb, accounts, accountNotes } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id, noteId } = await params;

  const [asset] = await getDb()
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.householdId, session.householdId)));

  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const [deleted] = await getDb()
    .delete(accountNotes)
    .where(and(eq(accountNotes.id, noteId), eq(accountNotes.accountId, id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ message: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
