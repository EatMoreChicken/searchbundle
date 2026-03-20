import { NextResponse } from "next/server";
import { getDb, netWorthCategories } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { name } = body as { name?: string };
  if (!name) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  const db = getDb();

  const [existing] = await db
    .select()
    .from(netWorthCategories)
    .where(
      and(
        eq(netWorthCategories.id, id),
        eq(netWorthCategories.householdId, session.householdId),
      ),
    );

  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(netWorthCategories)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(netWorthCategories.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { id } = await params;
  const db = getDb();

  const [existing] = await db
    .select()
    .from(netWorthCategories)
    .where(
      and(
        eq(netWorthCategories.id, id),
        eq(netWorthCategories.householdId, session.householdId),
      ),
    );

  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await db
    .delete(netWorthCategories)
    .where(eq(netWorthCategories.id, id));

  return NextResponse.json({ success: true });
}
