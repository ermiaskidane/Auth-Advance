import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth from "next-auth"
import { db } from "@/lib/db"
import authConfig from "@/auth.config"
import { UserRole } from "@prisma/client"
import { getUserById } from "./data/user"
import { getTwoFactorConfirmationByUserId } from "./data/two-factor-confirmation"
// import GitHub from "next-auth/providers/github"

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  //  this page occurs if user start to create the same email using Oauth
  // we customize it else it has it's own default page
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  //  events do update the emailverification for Oauth accounts(https://authjs.dev/guides/basics/events#linkaccount)
  events: {
    async linkAccount({ user }) {
      const Oauthverif = await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      })
      console.log("EDSFADSFAs", Oauthverif)
    }
  },
  callbacks: {
    async signIn({ user, account }) {
      // Allow OAuth without email verification else run the existingUser code
      if (account?.provider !== "credentials") return true;

      const existingUser = await getUserById(user.id);

      // Prevent sign in without email verification
      if (!existingUser?.emailVerified) return false;

      // if twoFactor dont match with the user not let them signin
      if (existingUser.isTwoFactorEnabled) {
        const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(existingUser.id);

        if (!twoFactorConfirmation) return false;

        // Delete two factor confirmation for next sign in
        await db.twoFactorConfirmation.delete({
          where: { id: twoFactorConfirmation.id }
        });
      }  

      return true;
    },
    async session({ token, session }) {
      console.log("session", {session})
      console.log("token", {token})
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
   
      if (token.role && session.user) {
        session.user.role = token.role as UserRole;
      }
      console.log("session2", {session})
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