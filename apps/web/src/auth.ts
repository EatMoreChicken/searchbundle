import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb, users, householdMembers } from "@searchbundle/db";
import { eq, asc } from "drizzle-orm";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    activeHouseholdId: string;
    mustResetPassword: boolean;
  }

  interface JWT {
    activeHouseholdId?: string;
    mustResetPassword?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const [user] = await getDb()
          .select()
          .from(users)
          .where(eq(users.email, email));

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        let activeHouseholdId = user.activeHouseholdId;
        if (!activeHouseholdId) {
          const [firstMembership] = await getDb()
            .select({ householdId: householdMembers.householdId })
            .from(householdMembers)
            .where(eq(householdMembers.userId, user.id))
            .orderBy(asc(householdMembers.joinedAt))
            .limit(1);
          activeHouseholdId = firstMembership?.householdId ?? null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          activeHouseholdId,
          mustResetPassword: user.mustResetPassword,
        };
      },
    }),
  ],
});
