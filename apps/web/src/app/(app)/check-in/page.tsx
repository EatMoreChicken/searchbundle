import ComingSoonPage from "@/components/ComingSoonPage";

export default function CheckInPage() {
  return (
    <ComingSoonPage
      overline="Check-In"
      title="Guided Check-In"
      summary="Step through one calm review flow and keep your financial plan current."
      icon="fa-circle-check"
      bullets={[
        "One-account-at-a-time updates with change detection",
        "Goal review prompts tailored to your latest data",
        "A concise monthly or quarterly summary",
        "Cooper debrief with suggested next actions",
      ]}
    />
  );
}
