"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { User } from "@/types";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "INR", label: "INR — Indian Rupee" },
];

type FormStatus = "idle" | "saving" | "success" | "error";

export default function SettingsPage() {
  const { data: session } = useSession();

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [personal, setPersonal] = useState({
    dateOfBirth: "",
    timezone: "America/Chicago",
    preferredCurrency: "USD",
    retirementAge: "",
    financialGoalNote: "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileStatus, setProfileStatus] = useState<FormStatus>("idle");
  const [personalStatus, setPersonalStatus] = useState<FormStatus>("idle");
  const [passwordStatus, setPasswordStatus] = useState<FormStatus>("idle");

  const [profileError, setProfileError] = useState("");
  const [personalError, setPersonalError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    apiClient
      .get<User>("/api/users/me")
      .then((user) => {
        setProfile({ name: user.name ?? "", email: user.email });
        setPersonal({
          dateOfBirth: user.dateOfBirth ?? "",
          timezone: user.timezone ?? "America/Chicago",
          preferredCurrency: user.preferredCurrency ?? "USD",
          retirementAge: user.retirementAge != null ? String(user.retirementAge) : "",
          financialGoalNote: user.financialGoalNote ?? "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus("saving");
    setProfileError("");
    try {
      await apiClient.patch("/api/users/me", {
        name: profile.name,
        email: profile.email,
      });
      setProfileStatus("success");
      setTimeout(() => setProfileStatus("idle"), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      setProfileError(msg);
      setProfileStatus("error");
    }
  }

  async function savePersonal(e: React.FormEvent) {
    e.preventDefault();
    setPersonalStatus("saving");
    setPersonalError("");
    try {
      await apiClient.patch("/api/users/me", {
        dateOfBirth: personal.dateOfBirth || null,
        timezone: personal.timezone,
        preferredCurrency: personal.preferredCurrency,
        retirementAge: personal.retirementAge ? Number(personal.retirementAge) : null,
        financialGoalNote: personal.financialGoalNote || null,
      });
      setPersonalStatus("success");
      setTimeout(() => setPersonalStatus("idle"), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      setPersonalError(msg);
      setPersonalStatus("error");
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus("saving");
    setPasswordError("");

    if (password.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      setPasswordStatus("error");
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setPasswordError("New passwords do not match");
      setPasswordStatus("error");
      return;
    }

    try {
      await apiClient.post("/api/users/me/password", {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPasswordStatus("success");
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordStatus("idle"), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      setPasswordError(msg);
      setPasswordStatus("error");
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[32px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <p className="text-label-sm font-semibold text-on-surface-variant tracking-widest uppercase mb-1">Account</p>
        <h1 className="text-headline-lg font-extrabold text-on-surface tracking-tight">Settings</h1>
      </div>

      {/* Profile Section */}
      <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">person</span>
          </div>
          <div>
            <h2 className="text-title-md font-bold text-on-surface">Profile</h2>
            <p className="text-sm text-on-surface-variant">Your name and email address</p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Display name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              placeholder="Your name"
              className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Email address</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              required
              className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {profileStatus === "error" && (
            <p className="text-sm text-error">{profileError}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={profileStatus === "saving"}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
            >
              {profileStatus === "saving" ? "Saving…" : "Save changes"}
            </button>
            {profileStatus === "success" && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Saved
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Personal & Financial Section */}
      <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[20px]">tune</span>
          </div>
          <div>
            <h2 className="text-title-md font-bold text-on-surface">Personal &amp; Financial</h2>
            <p className="text-sm text-on-surface-variant">Used for projections and planning</p>
          </div>
        </div>

        <form onSubmit={savePersonal} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">Date of birth</label>
              <input
                type="date"
                value={personal.dateOfBirth}
                onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))}
                className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">Target retirement age</label>
              <input
                type="number"
                min={1}
                max={120}
                value={personal.retirementAge}
                onChange={(e) => setPersonal((p) => ({ ...p, retirementAge: e.target.value }))}
                placeholder="e.g. 65"
                className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">Timezone</label>
              <select
                value={personal.timezone}
                onChange={(e) => setPersonal((p) => ({ ...p, timezone: e.target.value }))}
                className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">Preferred currency</label>
              <select
                value={personal.preferredCurrency}
                onChange={(e) => setPersonal((p) => ({ ...p, preferredCurrency: e.target.value }))}
                className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Primary financial goal</label>
            <textarea
              value={personal.financialGoalNote}
              onChange={(e) => setPersonal((p) => ({ ...p, financialGoalNote: e.target.value }))}
              rows={3}
              placeholder="e.g. Retire by 55 with $2M invested…"
              className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>

          {personalStatus === "error" && (
            <p className="text-sm text-error">{personalError}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={personalStatus === "saving"}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
            >
              {personalStatus === "saving" ? "Saving…" : "Save changes"}
            </button>
            {personalStatus === "success" && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Saved
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Security Section */}
      <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-error-container text-[20px]">lock</span>
          </div>
          <div>
            <h2 className="text-title-md font-bold text-on-surface">Security</h2>
            <p className="text-sm text-on-surface-variant">Update your password</p>
          </div>
        </div>

        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Current password</label>
            <input
              type="password"
              value={password.currentPassword}
              onChange={(e) => setPassword((p) => ({ ...p, currentPassword: e.target.value }))}
              required
              autoComplete="current-password"
              className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">New password</label>
            <input
              type="password"
              value={password.newPassword}
              onChange={(e) => setPassword((p) => ({ ...p, newPassword: e.target.value }))}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Confirm new password</label>
            <input
              type="password"
              value={password.confirmPassword}
              onChange={(e) => setPassword((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
              autoComplete="new-password"
              className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {passwordStatus === "error" && (
            <p className="text-sm text-error">{passwordError}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={passwordStatus === "saving"}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
            >
              {passwordStatus === "saving" ? "Updating…" : "Update password"}
            </button>
            {passwordStatus === "success" && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Password updated
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
