import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Send",
  description:
    "Create a continuous payment stream, milestone invoice, or vesting schedule on Stacks.",
};

export default function SendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
