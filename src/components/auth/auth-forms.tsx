"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Sparkles, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { loginSchema, registerSchema } from "@/lib/validations";

interface AuthFormProps {
  githubEnabled: boolean;
}

export function LoginForm({ githubEnabled }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGithubLoading, setIsGithubLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors(flat);
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Email hoặc mật khẩu chưa chính xác.");
        return;
      }

      toast.success("Đăng nhập thành công!");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Có lỗi kết nối khi đăng nhập.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGithubSignIn() {
    setIsGithubLoading(true);
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch {
      toast.error("Không thể kết nối GitHub OAuth.");
      setIsGithubLoading(false);
    }
  }

  function fillDemoCredentials() {
    setEmail("demo@financeplanner.vn");
    setPassword("Demo@123456");
    setFieldErrors({});
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-teal-600 text-white">
          <Wallet className="size-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl font-bold">Finance Planner</CardTitle>
        <CardDescription>
          Đăng nhập để theo dõi thu chi, ngân sách và mục tiêu tiết kiệm của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="ban@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            />
            {fieldErrors.email?.[0] && (
              <p
                id="login-email-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {fieldErrors.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Mật khẩu</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "login-password-error" : undefined
              }
            />
            {fieldErrors.password?.[0] && (
              <p
                id="login-password-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogIn className="mr-2 size-4" aria-hidden="true" />
            )}
            Đăng nhập
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={fillDemoCredentials}
        >
          <Sparkles className="mr-2 size-4" aria-hidden="true" />
          Điền nhanh tài khoản Demo (demo@financeplanner.vn)
        </Button>

        {githubEnabled ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGithubSignIn}
            disabled={isGithubLoading}
          >
            {isGithubLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <GithubIcon className="mr-2 size-4" />
            )}
            Tiếp tục với GitHub
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            GitHub OAuth sẽ tự kích hoạt khi bạn cấu hình{" "}
            <code>GITHUB_CLIENT_ID</code> & <code>GITHUB_CLIENT_SECRET</code>.
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Đăng ký ngay
        </Link>
      </CardFooter>
    </Card>
  );
}

export function RegisterForm({ githubEnabled }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const result = await authClient.signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Không thể tạo tài khoản.");
        return;
      }

      toast.success("Đăng ký thành công! Chào mừng bạn đến với Finance Planner.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Có lỗi kết nối khi đăng ký.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-teal-600 text-white">
          <UserPlus className="size-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl font-bold">Tạo tài khoản mới</CardTitle>
        <CardDescription>
          Bắt đầu quản lý tài chính cá nhân và wishlist mục tiêu tiết kiệm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="register-name">Họ và tên</Label>
            <Input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "register-name-error" : undefined}
            />
            {fieldErrors.name?.[0] && (
              <p
                id="register-name-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="ban@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={
                fieldErrors.email ? "register-email-error" : undefined
              }
            />
            {fieldErrors.email?.[0] && (
              <p
                id="register-email-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {fieldErrors.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-password">Mật khẩu (tối thiểu 8 ký tự)</Label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "register-password-error" : undefined
              }
            />
            {fieldErrors.password?.[0] && (
              <p
                id="register-password-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="mr-2 size-4" aria-hidden="true" />
            )}
            Đăng ký tài khoản
          </Button>
        </form>

        {githubEnabled && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() =>
              authClient.signIn.social({ provider: "github", callbackURL: "/" })
            }
          >
            <GithubIcon className="mr-2 size-4" />
            Đăng ký nhanh qua GitHub
          </Button>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          Đăng nhập
        </Link>
      </CardFooter>
    </Card>
  );
}
