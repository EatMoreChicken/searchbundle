import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, scenarios } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; scenarioId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { scenarioId } = await params;
  await getDb()
    .delete(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.userId, session.user.id)));

  return new NextResponse(null, { status: 204 });
}
