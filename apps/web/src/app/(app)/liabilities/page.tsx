import ComingSoonPage from "@/components/ComingSoonPage";

export default function LiabilitiesPage() {
  return (
    <ComingSoonPage
      overline="Finances"
      title="Liabilities"
      summary="Track balances, payoff timelines, and interest savings in one clear view."
      icon="fa-credit-card"
      bullets={[
        "Loan and credit account cards with payoff projections",
        "Snowball vs. avalanche strategy comparison",
        "Interest-saved insights as you adjust monthly payments",
        "Mortgage-focused principal and equity breakdowns",
      ]}
    />
  );
}
