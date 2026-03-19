import ComingSoonPage from "@/components/ComingSoonPage";

export default function DebtsPage() {
  return (
    <ComingSoonPage
      overline="Finances"
      title="Debts"
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
