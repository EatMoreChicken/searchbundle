import { NextResponse } from "next/server";
import { getDb, accounts, accountNotes } from "@searchbundle/db";
import { eq, and, desc } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

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
    .from(accountNotes)
    .where(eq(accountNotes.accountId, id))
    .orderBy(desc(accountNotes.createdAt));

  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
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

  const body = await request.json().catch(() => null);
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ message: "content is required" }, { status: 400 });
  }

  const [row] = await getDb()
    .insert(accountNotes)
    .values({
      accountId: id,
      householdId: session.householdId,
      content: body.content.trim(),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
