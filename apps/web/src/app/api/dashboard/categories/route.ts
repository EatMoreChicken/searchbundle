import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, netWorthCategories } from "@searchbundle/db";
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

  const { name, type } = body as { name?: string; type?: string };

  if (!name || !type || !["asset", "liability"].includes(type)) {
    return NextResponse.json(
      { message: "name and type (asset|liability) are required" },
      { status: 400 },
    );
  }

  const db = getDb();

  const existing = await db
    .select()
    .from(netWorthCategories)
    .where(
      and(
        eq(netWorthCategories.userId, session.user.id),
        eq(netWorthCategories.type, type as "asset" | "liability"),
      ),
    );

  const maxSort = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1);

  const [row] = await db
    .insert(netWorthCategories)
    .values({
      userId: session.user.id,
      name: name.trim(),
      type: type as "asset" | "liability",
      sortOrder: maxSort + 1,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
