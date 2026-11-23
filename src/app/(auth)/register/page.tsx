import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-forms";
import { isGithubOAuthConfigured } from "@/lib/auth";
import { getCurrentUser } from "@/lib/dal";

async function RegisterContent() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  return <RegisterForm githubEnabled={isGithubOAuthConfigured} />;
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense
        fallback={
          <div className="h-[460px] w-full max-w-md animate-pulse rounded-xl bg-muted" />
        }
      >
        <RegisterContent />
      </Suspense>
    </main>
  );
}
