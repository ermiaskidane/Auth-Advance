import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth from "next-auth"
import { db } from "@/lib/db"
import authConfig from "@/auth.config"
import { UserRole } from "@prisma/client"
import { getUserById } from "./data/user"
// import GitHub from "next-auth/providers/github"

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  callbacks: {
    async session({ token, session }) {
      console.log("session", {session})
      console.log("token", {token})
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.role && session.user) {
        session.user.role = token.role as UserRole;
      }

      return session;
    },
    async jwt({ token }) {
      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);

      if (!existingUser) return token;

      token.role = existingUser.role;
  
      // token.customField = "test";
      return token
    }
  },
  adapter: PrismaAdapter(db),
  // we cant use the session modal of database in "schamas/prisma.schema"
  // that's why we utilize the "jwt" instead of session modal, prisma is not edge compitable
  session: {strategy: "jwt"},
  ...authConfig
  // providers: [GitHub],
})