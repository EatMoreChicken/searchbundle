import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getDb, households, householdMembers, users } from "@searchbundle/db";
import { eq, asc } from "drizzle-orm";

export async function getHouseholdSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  let householdId: string | null = session.activeHouseholdId ?? null;

  if (householdId) {
    const [exists] = await getDb()
      .select({ id: households.id })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1);

    if (!exists) {
      householdId = null;
    }
  }

  if (!householdId) {
    const [membership] = await getDb()
      .select({ householdId: householdMembers.householdId })
      .from(householdMembers)
      .where(eq(householdMembers.userId, session.user.id))
      .orderBy(asc(householdMembers.joinedAt))
      .limit(1);

    householdId = membership?.householdId ?? null;

    if (householdId) {
      await getDb()
        .update(users)
        .set({ activeHouseholdId: householdId })
        .where(eq(users.id, session.user.id));
    }
  }

  if (!householdId) {
    return { error: NextResponse.json({ message: "No active household" }, { status: 403 }) };
  }

  return {
    userId: session.user.id,
    householdId,
  };
}
