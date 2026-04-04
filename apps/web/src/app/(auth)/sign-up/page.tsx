"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Account created but sign-in failed. Please sign in manually.");
      router.push("/sign-in");
    } else {
      router.push("/dashboard");
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
        <h1 className="mb-1 font-headline text-[26px] font-extrabold text-text-primary">Create your account</h1>
        <p className="mb-6 text-[14px] text-text-secondary">
          Start tracking your financial position
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-[13px] font-medium text-text-primary"
            >
              Name{" "}
              <span className="font-normal text-text-secondary">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
            />
          </div>

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
              Password{" "}
              <span className="font-normal text-text-secondary">(min. 8 characters)</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

