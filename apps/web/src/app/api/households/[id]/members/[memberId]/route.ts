import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, householdMembers } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";

async function requireAdminOrOwner(userId: string, householdId: string) {
  const [membership] = await getDb()
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)));
  if (!membership || membership.role === "member") return null;
  return membership;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const admin = await requireAdminOrOwner(session.user.id, id);
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { role } = body as { role?: string };
  if (!role || !["admin", "member"].includes(role)) {
    return NextResponse.json({ message: "role must be admin or member" }, { status: 400 });
  }

  const [target] = await getDb()
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, id)));

  if (!target) {
    return NextResponse.json({ message: "Member not found" }, { status: 404 });
  }

  if (target.role === "owner") {
    return NextResponse.json({ message: "Cannot change owner role" }, { status: 400 });
  }

  const [updated] = await getDb()
    .update(householdMembers)
    .set({ role: role as "admin" | "member" })
    .where(eq(householdMembers.id, memberId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id, memberId } = await params;
  const admin = await requireAdminOrOwner(session.user.id, id);
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [target] = await getDb()
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, id)));

  if (!target) {
    return NextResponse.json({ message: "Member not found" }, { status: 404 });
  }

  if (target.role === "owner") {
    return NextResponse.json({ message: "Cannot remove the owner" }, { status: 400 });
  }

  await getDb()
    .delete(householdMembers)
    .where(eq(householdMembers.id, memberId));

  return new NextResponse(null, { status: 204 });
}
