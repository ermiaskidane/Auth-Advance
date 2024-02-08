import { UserRole } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";

// behind the seen here we type safe the session of auth.ts
export type ExtendedUser = DefaultSession["user"] & {
  role: UserRole;
  isTwoFactorEnabled: boolean;
  isOAuth: boolean;
};

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}