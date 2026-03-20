import ComingSoonPage from "@/components/ComingSoonPage";

export default function ProjectionsPage() {
  return (
    <ComingSoonPage
      overline="Plans"
      title="Projections"
      summary="Model future outcomes with contribution plans, assumptions, and scenario testing."
      icon="query_stats"
      bullets={[
        "Target-date and target-amount planning for each account",
        "What-if sliders for growth rate and contribution changes",
        "Compound-interest visualizations over time",
        "On-track indicators tied to your long-term goals",
      ]}
    />
  );
}
