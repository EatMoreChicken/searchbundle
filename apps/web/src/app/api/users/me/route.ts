import { NextResponse } from "next/server";
import { getDb, users } from "@searchbundle/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      dateOfBirth: users.dateOfBirth,
      timezone: users.timezone,
      preferredCurrency: users.preferredCurrency,
      retirementAge: users.retirementAge,
      activeHouseholdId: users.activeHouseholdId,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { name, email, dateOfBirth, timezone, preferredCurrency, retirementAge } = body as {
    name?: string;
    email?: string;
    dateOfBirth?: string | null;
    timezone?: string;
    preferredCurrency?: string;
    retirementAge?: number | null;
  };

  if (email !== undefined) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }
    const [existing] = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ message: "Email is already in use" }, { status: 409 });
    }
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (name !== undefined) updates.name = name || null;
  if (email !== undefined) updates.email = email;
  if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth || null;
  if (timezone !== undefined) updates.timezone = timezone;
  if (preferredCurrency !== undefined) updates.preferredCurrency = preferredCurrency;
  if (retirementAge !== undefined) updates.retirementAge = retirementAge ?? null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }

  const [updated] = await getDb()
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      dateOfBirth: users.dateOfBirth,
      timezone: users.timezone,
      preferredCurrency: users.preferredCurrency,
      retirementAge: users.retirementAge,
      activeHouseholdId: users.activeHouseholdId,
    });

  return NextResponse.json(updated);
}
