import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, users } from "@searchbundle/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { message: "currentPassword and newPassword are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const [user] = await getDb()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user?.passwordHash) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await getDb()
    .update(users)
    .set({ passwordHash: newHash, mustResetPassword: false })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ message: "Password updated successfully" });
}
