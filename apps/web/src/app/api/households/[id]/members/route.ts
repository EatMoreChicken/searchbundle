import { NextResponse } from "next/server";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { getDb, households, householdMembers, users } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

async function requireAdminOrOwner(userId: string, householdId: string) {
  const [membership] = await getDb()
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)));
  if (!membership || membership.role === "member") return null;
  return membership;
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

  const [membership] = await getDb()
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, id), eq(householdMembers.userId, session.user.id)));

  if (!membership) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const members = await getDb()
    .select({
      id: householdMembers.id,
      userId: householdMembers.userId,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
      email: users.email,
      name: users.name,
    })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, id));

  return NextResponse.json(members);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = await requireAdminOrOwner(session.user.id, id);
  if (!admin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { email, name, role = "member" } = body as { email?: string; name?: string; role?: string };

  if (!email?.trim()) {
    return NextResponse.json({ message: "email is required" }, { status: 400 });
  }

  if (!["admin", "member"].includes(role)) {
    return NextResponse.json({ message: "role must be admin or member" }, { status: 400 });
  }

  const db = getDb();

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()));

  let tempPassword: string | null = null;

  if (!user) {
    tempPassword = crypto.randomBytes(8).toString("hex");
    const hash = await bcrypt.hash(tempPassword, 12);
    [user] = await db
      .insert(users)
      .values({
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        passwordHash: hash,
        mustResetPassword: true,
      })
      .returning();
  }

  const [existingMember] = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, id), eq(householdMembers.userId, user.id)));

  if (existingMember) {
    return NextResponse.json({ message: "User is already a member" }, { status: 409 });
  }

  const [member] = await db
    .insert(householdMembers)
    .values({
      householdId: id,
      userId: user.id,
      role: role as "admin" | "member",
    })
    .returning();

  if (!user.activeHouseholdId) {
    await db
      .update(users)
      .set({ activeHouseholdId: id })
      .where(eq(users.id, user.id));
  }

  return NextResponse.json({
    ...member,
    email: user.email,
    name: user.name,
    tempPassword,
  }, { status: 201 });
}
