import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, householdMembers, users } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { householdId } = body as { householdId?: string };
  if (!householdId) {
    return NextResponse.json({ message: "householdId is required" }, { status: 400 });
  }

  const [membership] = await getDb()
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, session.user.id)));

  if (!membership) {
    return NextResponse.json({ message: "Not a member of this household" }, { status: 403 });
  }

  await getDb()
    .update(users)
    .set({ activeHouseholdId: householdId })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ activeHouseholdId: householdId });
}
