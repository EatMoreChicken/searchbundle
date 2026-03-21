import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function getHouseholdSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.activeHouseholdId) {
    return { error: NextResponse.json({ message: "No active household" }, { status: 403 }) };
  }
  return {
    userId: session.user.id,
    householdId: session.activeHouseholdId,
  };
}
