import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const hasGithubOAuth =
  Boolean(githubClientId) &&
  Boolean(githubClientSecret) &&
  githubClientId !== "your-github-oauth-client-id" &&
  githubClientSecret !== "your-github-oauth-client-secret";

const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;
const vercelPreviewUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const resolvedBaseURL =
  process.env.BETTER_AUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  vercelProdUrl ||
  vercelPreviewUrl ||
  "http://localhost:3000";

const trustedOrigins = Array.from(
  new Set(
    [
      resolvedBaseURL,
      process.env.BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      vercelProdUrl,
      vercelPreviewUrl,
      ...(process.env.NODE_ENV !== "production"
        ? ["http://localhost:3000", "http://127.0.0.1:3000"]
        : []),
    ]
      .map((origin) => origin?.trim())
      .filter((origin): origin is string => Boolean(origin))
  )
);

const envSecret = process.env.BETTER_AUTH_SECRET?.trim();
if (
  !envSecret &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  throw new Error(
    "Thiếu biến môi trường BETTER_AUTH_SECRET trên môi trường production."
  );
}
const secret =
  envSecret || "dev-only-fallback-secret-must-be-at-least-32-chars";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret,
  baseURL: resolvedBaseURL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  ...(hasGithubOAuth
    ? {
        socialProviders: {
          github: {
            clientId: githubClientId!,
            clientSecret: githubClientSecret!,
          },
        },
      }
    : {}),
  plugins: [nextCookies()],
});

export const isGithubOAuthConfigured = hasGithubOAuth;
