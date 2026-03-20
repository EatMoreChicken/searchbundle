import { NextResponse } from "next/server";
import { getDb, scenarios } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; scenarioId: string }> }
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { scenarioId } = await params;
  await getDb()
    .delete(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.householdId, session.householdId)));

  return new NextResponse(null, { status: 204 });
}
