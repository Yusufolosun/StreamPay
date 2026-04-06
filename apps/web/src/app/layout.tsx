// TODO: Implement root layout with providers
// - Add Stacks wallet provider
// - Add global styles
// - Add metadata configuration
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
