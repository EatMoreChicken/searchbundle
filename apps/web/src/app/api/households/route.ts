import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, households, householdMembers, users } from "@searchbundle/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const memberships = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
      householdName: households.name,
      createdBy: households.createdBy,
      householdCreatedAt: households.createdAt,
    })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, session.user.id));

  return NextResponse.json(memberships);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { name } = body as { name?: string };
  if (!name?.trim()) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  const db = getDb();

  const [household] = await db
    .insert(households)
    .values({
      name: name.trim(),
      createdBy: session.user.id,
    })
    .returning();

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: session.user.id,
    role: "owner",
  });

  return NextResponse.json(household, { status: 201 });
}
