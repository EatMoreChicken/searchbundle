import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, netWorthCategories, netWorthEntries } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { categoryId, year, month, value } = body as {
    categoryId?: string;
    year?: number;
    month?: number;
    value?: number;
  };

  if (!categoryId || year === undefined || month === undefined || value === undefined) {
    return NextResponse.json(
      { message: "categoryId, year, month, and value are required" },
      { status: 400 },
    );
  }

  if (month < 1 || month > 12) {
    return NextResponse.json({ message: "month must be 1-12" }, { status: 400 });
  }

  const db = getDb();

  const [category] = await db
    .select()
    .from(netWorthCategories)
    .where(
      and(
        eq(netWorthCategories.id, categoryId),
        eq(netWorthCategories.userId, session.user.id),
      ),
    );

  if (!category) {
    return NextResponse.json({ message: "Category not found" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(netWorthEntries)
    .where(
      and(
        eq(netWorthEntries.categoryId, categoryId),
        eq(netWorthEntries.year, year),
        eq(netWorthEntries.month, month),
      ),
    );

  let entry;
  if (existing) {
    [entry] = await db
      .update(netWorthEntries)
      .set({ value: String(value), updatedAt: new Date() })
      .where(eq(netWorthEntries.id, existing.id))
      .returning();
  } else {
    [entry] = await db
      .insert(netWorthEntries)
      .values({
        categoryId,
        year,
        month,
        value: String(value),
      })
      .returning();
  }

  return NextResponse.json({
    ...entry,
    value: parseFloat(entry.value),
  });
}
