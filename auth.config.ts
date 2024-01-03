import GitHub from "next-auth/providers/github"
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth"
import credentials from "next-auth/providers/credentials"
import { LoginSchema } from "@/schemas"
import { getUserByEmail } from "@/data/user"

export default {
  // note that we use prisma inside the providers cz this doesnt run in the edge 
  providers: [
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