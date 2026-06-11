import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Receive",
  description:
    "Monitor incoming real-time payment streams, claim claimable balances, and manage milestone invoices.",
};

export default function ReceiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
