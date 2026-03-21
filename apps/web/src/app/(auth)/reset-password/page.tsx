"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/users/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message || "Failed to update password");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: undefined,
      password: newPassword,
      redirect: false,
    });

    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed/30">
          <span className="text-sm font-bold text-primary">SB</span>
        </div>
        <span className="text-[17px] font-semibold tracking-tight text-on-surface">
          SearchBundle
        </span>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_24px_68px_rgba(0,0,0,0.06)]">
        <h1 className="mb-1 font-headline text-[26px] font-extrabold text-on-surface">
          Set Your Password
        </h1>
        <p className="mb-6 text-[14px] text-on-surface-variant">
          You were invited to a household. Please set a new password to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-[13px] font-medium text-on-surface">
              Temporary Password
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter the password you were given"
              className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-[13px] font-medium text-on-surface">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-[13px] font-medium text-on-surface">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="rounded-2xl bg-error-container px-4 py-3 text-[13px] font-medium text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-gradient-to-r from-primary to-primary-container px-4 py-3.5 text-[14px] font-semibold text-on-primary transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "Updating…" : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
