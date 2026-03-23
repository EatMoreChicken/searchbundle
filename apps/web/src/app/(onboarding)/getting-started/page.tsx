"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { User, RetirementTarget } from "@/types";
import OnboardingWizard from "@/components/OnboardingWizard";

export default function GettingStartedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([
        apiClient.get<User>("/api/users/me"),
        apiClient.get<RetirementTarget | null>("/api/retirement-target"),
      ]);

      if (u.dateOfBirth && u.retirementAge != null && t) {
        router.replace("/dashboard");
        return;
      }

      setUser(u);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session, loadData]);

  function handleComplete() {
    router.push("/dashboard");
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined text-primary animate-spin text-[32px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <OnboardingWizard user={user} onComplete={handleComplete} />
    </div>
  );
}
