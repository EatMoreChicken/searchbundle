import ComingSoonPage from "@/components/ComingSoonPage";

export default function CooperPage() {
  return (
    <ComingSoonPage
      overline="AI Companion"
      title="Cooper"
      summary="Get guided, forward-looking advice based on your accounts, debts, and goals."
      icon="smart_toy"
      bullets={[
        "Natural-language Q&A grounded in your financial profile",
        "Scenario planning support for major decisions",
        "Clear explanations for financial terms and tradeoffs",
        "Action-focused check-in debriefs after each update",
      ]}
    />
  );
}
