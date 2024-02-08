"use server";
import { signIn } from "@/auth";
import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import { getUserByEmail } from "@/data/user";
import { db } from "@/lib/db";
import { sendTwoFactorTokenEmail, sendVerificationEmail } from "@/lib/mail";
import { generateTwoFactorToken, generateVerificationToken } from "@/lib/tokens";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { LoginSchema } from "@/schemas";
import { AuthError } from "next-auth";
import * as z from "zod";

export const login = async(values: z.infer<typeof LoginSchema>) => {
  // console.log(values)
  const validatedFields = LoginSchema.safeParse(values);

  if(!validatedFields.success) {
    return { error:  "Invalid fields!"}
  }

  const { email, password, code} = validatedFields.data;

  // lets generate the token up on login user 
  const existingUser = await getUserByEmail(email);

  if (!existingUser || !existingUser.email || !existingUser.password) {
    return { error: "Email does not exist!" }
  }

  // block users not verified
  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(
      existingUser.email,
    );

    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token,
    );

    return { success: "Confirmation email sent!" };
  }

  // check 2FA enabled 
  if (existingUser.isTwoFactorEnabled && existingUser.email) {
    // up on code, check the getTwoFactorTokenByEmail then delete it 
    // after check getTwoFactorConfirmationByUserId if user has
    if (code) {
      const twoFactorToken = await getTwoFactorTokenByEmail(
        existingUser.email
      );

      if (!twoFactorToken) {
        return { error: "Invalid code!" };
      }

      if (twoFactorToken.token !== code) {
        return { error: "Invalid code!" };
      }
  const hasExpired = new Date(twoFactorToken.expires) < new Date();

  if (hasExpired) {
    return { error: "Code expired!" };
  }

  await db.twoFactorToken.delete({
    where: { id: twoFactorToken.id }
  });

  const existingConfirmation = await getTwoFactorConfirmationByUserId(
    existingUser.id
  );

  if (existingConfirmation) {
    await db.twoFactorConfirmation.delete({
      where: { id: existingConfirmation.id }
    });
  }
// note after twoFactorConfirmation here it will go to auth.ts and delete it there
// under the callback signIn method
  await db.twoFactorConfirmation.create({
    data: {
      userId: existingUser.id,
    }
  });
} else {
  // when user does not have 2FA generate it and send to email
  const twoFactorToken = await generateTwoFactorToken(existingUser.email)
  await sendTwoFactorTokenEmail(
    twoFactorToken.email,
    twoFactorToken.token,
  );

  return { twoFactor: true };
}
 }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo:  DEFAULT_LOGIN_REDIRECT,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials!" }
        default:
          return { error: "Something went wrong!" }
      }
    }

    throw error;
  }
}