import { NextResponse } from "next/server";
import { getDb, netWorthCategories, netWorthEntries } from "@searchbundle/db";
import { eq, and } from "drizzle-orm";
import { getHouseholdSession } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const session = await getHouseholdSession();
  if ("error" in session) return session.error;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

  if (isNaN(year) || year < 1900 || year > 2200) {
    return NextResponse.json({ message: "Invalid year" }, { status: 400 });
  }

  const db = getDb();

  const categories = await db
    .select()
    .from(netWorthCategories)
    .where(eq(netWorthCategories.householdId, session.householdId))
    .orderBy(netWorthCategories.type, netWorthCategories.sortOrder);

  const categoryIds = categories.map((c) => c.id);

  let entries: (typeof netWorthEntries.$inferSelect)[] = [];
  if (categoryIds.length > 0) {
    const allEntries = await db
      .select()
      .from(netWorthEntries)
      .where(eq(netWorthEntries.year, year));

    entries = allEntries.filter((e) => categoryIds.includes(e.categoryId));
  }

  return NextResponse.json({
    categories,
    entries: entries.map((e) => ({
      ...e,
      value: parseFloat(e.value),
    })),
  });
}
