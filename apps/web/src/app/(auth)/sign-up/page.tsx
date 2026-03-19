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
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-teal-light">
          <span className="font-heading text-sm font-bold text-teal">SB</span>
        </div>
        <span className="font-heading text-[17px] font-semibold tracking-tight text-text">
          SearchBundle
        </span>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-elevated p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_24px_68px_rgba(0,0,0,0.06)]">
        <h1 className="mb-1 font-display text-[26px] text-text">Create your account</h1>
        <p className="mb-6 text-[14px] text-text-secondary">
          Start tracking your financial position
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-[13px] font-medium text-text"
            >
              Name{" "}
              <span className="font-normal text-text-tertiary">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-medium text-text"
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
              className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-medium text-text"
            >
              Password{" "}
              <span className="font-normal text-text-tertiary">(min. 8 characters)</span>
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
              className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-[10px] bg-red-light px-4 py-3 text-[13px] font-medium text-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-[10px] bg-text px-4 py-3.5 text-[14px] font-semibold text-bg transition-transform hover:-translate-y-px disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-teal hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

