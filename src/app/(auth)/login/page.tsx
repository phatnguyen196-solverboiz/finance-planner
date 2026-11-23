import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { isGithubOAuthConfigured } from "@/lib/auth";
import { getCurrentUser } from "@/lib/dal";

async function LoginContent() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return <LoginForm githubEnabled={isGithubOAuthConfigured} />;
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense
        fallback={
          <div className="h-[420px] w-full max-w-md animate-pulse rounded-xl bg-muted" />
        }
      >
        <LoginContent />
      </Suspense>
    </main>
  );
}
