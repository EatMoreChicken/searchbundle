import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb, accounts } from "@searchbundle/db";
import { eq } from "drizzle-orm";

type AccountRow = typeof accounts.$inferSelect;

function parseAccount(row: AccountRow) {
  return { ...row, balance: parseFloat(row.balance) };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rows = await getDb()
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  return NextResponse.json(rows.map(parseAccount));
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

  const { name, type, balance, currency = "USD", notes } = body as {
    name?: string;
    type?: string;
    balance?: unknown;
    currency?: string;
    notes?: string;
  };

  if (!name || !type || balance === undefined) {
    return NextResponse.json(
      { message: "name, type, and balance are required" },
      { status: 400 }
    );
  }

  const [row] = await getDb()
    .insert(accounts)
    .values({
      name,
      type: type as typeof accounts.$inferInsert["type"],
      balance: String(balance),
      currency,
      notes,
      userId: session.user.id,
    })
    .returning();

  return NextResponse.json(parseAccount(row), { status: 201 });
}
