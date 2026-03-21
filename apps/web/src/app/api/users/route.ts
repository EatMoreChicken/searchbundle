import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, users, households, householdMembers } from "@searchbundle/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { email, password, name } = body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { message: "email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const [existing] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    return NextResponse.json(
      { message: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const db = getDb();

  const [user] = await db
    .insert(users)
    .values({ email, name: name ?? null, passwordHash })
    .returning({ id: users.id, email: users.email });

  const [household] = await db
    .insert(households)
    .values({ name: "My Household", createdBy: user.id })
    .returning({ id: households.id });

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: user.id,
    role: "owner",
  });

  await db
    .update(users)
    .set({ activeHouseholdId: household.id })
    .where(eq(users.id, user.id));

  return NextResponse.json(user, { status: 201 });
}
