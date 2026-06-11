import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorer",
  description:
    "Explore public real-time payment streams, check global protocol stats, and view transaction details on the Stacks blockchain.",
};

export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
