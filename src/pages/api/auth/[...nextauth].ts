import NextAuth from "next-auth/next";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  secret: process.env.SECRET!,
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return new URL(url, baseUrl).toString();
      else if (url.startsWith("https://buy.stripe.com")) return url;
      return baseUrl;
    },
    async session({ user, session }) {
      const onboard = await prisma.onboard.findUnique({
        where: {
          email: user.email!,
        },
      });

      if (onboard) {
        await prisma.user.update({
          where: {
            email: user.email!,
          },
          data: {
            earlyAccess: true,
          },
        });
        await prisma.onboard.update({
          where: {
            email: user.email!,
          },
          data: {
            onboarded: true,
          },
        });
      }

      const result = await prisma.user.findUnique({
        where: {
          email: user.email!,
        },
      });

      if (result?.earlyAccess) session.early_access = true;
      else session.early_access = false;

      return session;
    },
  },
});
