"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light/30">
          <span className="text-sm font-bold text-accent">SB</span>
        </div>
        <span className="text-[17px] font-semibold tracking-tight text-text-primary">
          SearchBundle
        </span>
      </div>

      {/* Card */}
      <div className="rounded-xl bg-surface p-8">
        <h1 className="mb-1 font-headline text-[26px] font-extrabold text-text-primary">Welcome back</h1>
        <p className="mb-6 text-[14px] text-text-secondary">
          Sign in to your account to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-medium text-text-primary"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-medium text-text-primary"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-error-light px-4 py-3 text-[13px] font-medium text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-gradient-to-r from-accent to-accent-hover px-4 py-3.5 text-[14px] font-semibold text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

