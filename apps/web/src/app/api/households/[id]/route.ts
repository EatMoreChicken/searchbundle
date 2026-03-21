import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, households, householdMembers } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";

async function requireMembership(userId: string, householdId: string) {
  const [membership] = await getDb()
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)));
  return membership ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await requireMembership(session.user.id, id);
  if (!membership) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const [household] = await getDb()
    .select()
    .from(households)
    .where(eq(households.id, id));

  if (!household) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(household);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await requireMembership(session.user.id, id);
  if (!membership || membership.role === "member") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { name, financialGoalNote } = body as { name?: string; financialGoalNote?: string | null };

  const updates: Partial<typeof households.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (financialGoalNote !== undefined) updates.financialGoalNote = financialGoalNote || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }

  const [updated] = await getDb()
    .update(households)
    .set(updates)
    .where(eq(households.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await requireMembership(session.user.id, id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ message: "Only the owner can delete a household" }, { status: 403 });
  }

  await getDb().delete(households).where(eq(households.id, id));

  return new NextResponse(null, { status: 204 });
}
