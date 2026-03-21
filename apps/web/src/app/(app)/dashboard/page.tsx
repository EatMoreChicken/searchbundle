import ComingSoonPage from "@/components/ComingSoonPage";

export default function DashboardPage() {
  return (
    <ComingSoonPage
      overline="Dashboard"
      title="Your Financial Overview"
      summary="Your personalized financial overview is coming soon — key metrics, goal progress, and AI-powered insights all in one place."
      bullets={[
        "Net worth snapshot with trend indicators",
        "Goal progress and on-track status across all accounts",
        "Cooper AI insights and recommended next actions",
        "Upcoming milestones and payoff dates",
      ]}
      icon="dashboard"
    />
  );
}
