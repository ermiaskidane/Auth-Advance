import GitHub from "next-auth/providers/github"
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth"
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import credentials from "next-auth/providers/credentials"
import { LoginSchema } from "@/schemas"
import { getUserByEmail } from "@/data/user"

export default {
  // note that we use prisma inside the providers cz this doesnt run in the edge 
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Github({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    credentials({
      async authorize(credentials) {
        // cz user can bypass the action server we have to check validation of fields
        const validatedFields = LoginSchema.safeParse(credentials)

        if(validatedFields.success) {
          const { email, password} = validatedFields.data

          const user = await getUserByEmail(email);
          if(!user || !user.password) return null;

          const passwordsMatch = await bcrypt.compare(
            password,
            user.password
          );

          if (passwordsMatch) return user;
        }

        return null
      }
    })
  ],
} satisfies NextAuthConfig