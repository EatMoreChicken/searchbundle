import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "SearchBundle – Your Financial Checkpoint",
  description:
    "A periodic check-in for your financial life. Track net worth, plan projections, and get guidance from Cooper AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
