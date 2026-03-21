"use client";

import { useState, useEffect, useCallback } from "react";
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

interface HouseholdMembership {
  householdId: string;
  role: string;
  joinedAt: string;
  householdName: string;
}

interface HouseholdMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  email: string;
  name: string | null;
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [personal, setPersonal] = useState({
    dateOfBirth: "",
    timezone: "America/Chicago",
    preferredCurrency: "USD",
    retirementAge: "",
  });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [households, setHouseholds] = useState<HouseholdMembership[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [householdName, setHouseholdName] = useState("");
  const [financialGoalNote, setFinancialGoalNote] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteResult, setInviteResult] = useState<{ tempPassword?: string; message?: string } | null>(null);

  const [profileStatus, setProfileStatus] = useState<FormStatus>("idle");
  const [personalStatus, setPersonalStatus] = useState<FormStatus>("idle");
  const [passwordStatus, setPasswordStatus] = useState<FormStatus>("idle");
  const [householdStatus, setHouseholdStatus] = useState<FormStatus>("idle");

  const [profileError, setProfileError] = useState("");
  const [personalError, setPersonalError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [householdError, setHouseholdError] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [loading, setLoading] = useState(true);

  const [savedProfile, setSavedProfile] = useState({ name: "", email: "" });
  const [savedPersonal, setSavedPersonal] = useState({
    dateOfBirth: "",
    timezone: "America/Chicago",
    preferredCurrency: "USD",
    retirementAge: "",
  });
  const [savedHousehold, setSavedHousehold] = useState({ name: "", financialGoalNote: "" });

  const sessionHouseholdId = (session as { activeHouseholdId?: string } | null)?.activeHouseholdId;
  const [resolvedHouseholdId, setResolvedHouseholdId] = useState<string | null>(null);

  const activeHouseholdId = sessionHouseholdId ?? resolvedHouseholdId;

  const loadHouseholdData = useCallback(async (hId: string) => {
    try {
      const [hData, mData] = await Promise.all([
        apiClient.get<{ id: string; name: string; financialGoalNote: string | null }>(`/api/households/${hId}`),
        apiClient.get<HouseholdMember[]>(`/api/households/${hId}/members`),
      ]);
      setHouseholdName(hData.name);
      setFinancialGoalNote(hData.financialGoalNote ?? "");
      setSavedHousehold({ name: hData.name, financialGoalNote: hData.financialGoalNote ?? "" });
      setMembers(mData);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    Promise.all([
      apiClient.get<User>("/api/users/me"),
      apiClient.get<HouseholdMembership[]>("/api/households"),
    ]).then(([user, hList]) => {
      setProfile({ name: user.name ?? "", email: user.email });
      setSavedProfile({ name: user.name ?? "", email: user.email });
      const loadedPersonal = {
        dateOfBirth: user.dateOfBirth ?? "",
        timezone: user.timezone ?? "America/Chicago",
        preferredCurrency: user.preferredCurrency ?? "USD",
        retirementAge: user.retirementAge != null ? String(user.retirementAge) : "",
      };
      setPersonal(loadedPersonal);
      setSavedPersonal(loadedPersonal);
      setHouseholds(hList);
      if (!sessionHouseholdId) {
        const fallbackId = user.activeHouseholdId ?? hList[0]?.householdId ?? null;
        if (fallbackId) setResolvedHouseholdId(fallbackId);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [session, sessionHouseholdId]);

  useEffect(() => {
    if (activeHouseholdId) {
      loadHouseholdData(activeHouseholdId);
    }
  }, [activeHouseholdId, loadHouseholdData]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus("saving");
    setProfileError("");
    try {
      await apiClient.patch("/api/users/me", {
        name: profile.name,
        email: profile.email,
      });
      setSavedProfile({ name: profile.name, email: profile.email });
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
      });
      setSavedPersonal({ ...personal });
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

  async function saveHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!activeHouseholdId) return;
    setHouseholdStatus("saving");
    setHouseholdError("");
    try {
      await apiClient.patch(`/api/households/${activeHouseholdId}`, {
        name: householdName,
        financialGoalNote: financialGoalNote || null,
      });
      setSavedHousehold({ name: householdName, financialGoalNote });
      setHouseholdStatus("success");
      setTimeout(() => setHouseholdStatus("idle"), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save household";
      setHouseholdError(msg);
      setHouseholdStatus("error");
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!activeHouseholdId) return;
    setInviteError("");
    setInviteResult(null);
    try {
      const result = await apiClient.post<{ tempPassword?: string }>(`/api/households/${activeHouseholdId}/members`, {
        email: inviteEmail,
        name: inviteName || undefined,
      });
      setInviteEmail("");
      setInviteName("");
      if (result.tempPassword) {
        setInviteResult({ tempPassword: result.tempPassword });
      } else {
        setInviteResult({ message: "Member added" });
      }
      loadHouseholdData(activeHouseholdId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to invite member";
      setInviteError(msg);
    }
  }

  async function removeMember(memberId: string) {
    if (!activeHouseholdId) return;
    try {
      await apiClient.delete(`/api/households/${activeHouseholdId}/members/${memberId}`);
      loadHouseholdData(activeHouseholdId);
    } catch { /* ignore */ }
  }

  async function switchHousehold(householdId: string) {
    try {
      await apiClient.post("/api/households/switch", { householdId });
      await updateSession({ activeHouseholdId: householdId });
      window.location.reload();
    } catch { /* ignore */ }
  }

  const isProfileDirty = profile.name !== savedProfile.name || profile.email !== savedProfile.email;
  const isPersonalDirty = JSON.stringify(personal) !== JSON.stringify(savedPersonal);
  const isHouseholdDirty = householdName !== savedHousehold.name || financialGoalNote !== savedHousehold.financialGoalNote;
  const isPasswordDirty = Boolean(password.currentPassword && password.newPassword && password.confirmPassword);

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
              disabled={profileStatus === "saving" || !isProfileDirty}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 ${
                isProfileDirty
                  ? "text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95"
                  : "text-on-surface-variant bg-surface-container-high cursor-not-allowed"
              }`}
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

          {personalStatus === "error" && (
            <p className="text-sm text-error">{personalError}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={personalStatus === "saving" || !isPersonalDirty}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 ${
                isPersonalDirty
                  ? "text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95"
                  : "text-on-surface-variant bg-surface-container-high cursor-not-allowed"
              }`}
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

      {/* Household Section */}
      {activeHouseholdId && (
        <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container text-[20px]">group</span>
            </div>
            <div>
              <h2 className="text-title-md font-bold text-on-surface">Household</h2>
              <p className="text-sm text-on-surface-variant">Manage your household and members</p>
            </div>
          </div>

          {households.length > 1 && (
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">Switch household</label>
              <div className="flex flex-wrap gap-2">
                {households.map((h) => (
                  <button
                    key={h.householdId}
                    onClick={() => h.householdId !== activeHouseholdId && switchHousehold(h.householdId)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      h.householdId === activeHouseholdId
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                    }`}
                  >
                    {h.householdName}
                    <span className="ml-1.5 text-[11px] opacity-70">({h.role})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={saveHousehold} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">Household name</label>
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="My Household"
                className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">Primary financial goal</label>
              <textarea
                value={financialGoalNote}
                onChange={(e) => setFinancialGoalNote(e.target.value)}
                rows={3}
                placeholder="e.g. Retire by 55 with $2M invested…"
                className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all resize-none"
              />
            </div>

            {householdStatus === "error" && (
              <p className="text-sm text-error">{householdError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={householdStatus === "saving" || !isHouseholdDirty}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 ${
                  isHouseholdDirty
                    ? "text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95"
                    : "text-on-surface-variant bg-surface-container-high cursor-not-allowed"
                }`}
              >
                {householdStatus === "saving" ? "Saving…" : "Save changes"}
              </button>
              {householdStatus === "success" && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Saved
                </span>
              )}
            </div>
          </form>

          {/* Members list */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-on-surface mb-3">Members</h3>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-surface-container-low rounded-2xl px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-on-surface">{m.name || m.email}</span>
                    {m.name && <span className="ml-2 text-xs text-on-surface-variant">{m.email}</span>}
                    <span className="ml-2 text-xs font-medium text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
                      {m.role}
                    </span>
                  </div>
                  {m.role !== "owner" && m.userId !== session?.user?.id && (
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-sm text-error hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite member */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-on-surface mb-3">Invite a member</h3>
            <form onSubmit={inviteMember} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="Email address"
                  className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              {inviteError && <p className="text-sm text-error">{inviteError}</p>}

              {inviteResult?.tempPassword && (
                <div className="rounded-2xl bg-tertiary-fixed p-4">
                  <p className="text-sm font-medium text-on-tertiary-fixed-variant">
                    Account created! Share this temporary password:
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-on-tertiary-fixed-variant select-all">
                    {inviteResult.tempPassword}
                  </p>
                  <p className="mt-1 text-xs text-on-tertiary-fixed-variant/70">
                    They will be asked to set a new password on first sign-in.
                  </p>
                </div>
              )}

              {inviteResult?.message && !inviteResult.tempPassword && (
                <p className="text-sm font-medium text-secondary">{inviteResult.message}</p>
              )}

              <button
                type="submit"
                disabled={!inviteEmail}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 ${
                  inviteEmail
                    ? "text-on-secondary-container bg-secondary-container hover:scale-105 active:scale-95"
                    : "text-on-surface-variant bg-surface-container-high cursor-not-allowed"
                }`}
              >
                Send invite
              </button>
            </form>
          </div>
        </section>
      )}

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
              disabled={passwordStatus === "saving" || !isPasswordDirty}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 ${
                isPasswordDirty
                  ? "text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95"
                  : "text-on-surface-variant bg-surface-container-high cursor-not-allowed"
              }`}
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
