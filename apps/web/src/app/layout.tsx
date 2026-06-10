import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Navbar } from "../components/Navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/* Geist Mono is not yet on Google Fonts; JetBrains Mono provides the same
   crisp monospaced aesthetic for numerical readouts. When Geist Mono becomes
   available via next/font/google, swap the import. */
const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StreamPay — Real-Time Stacks Payments",
    template: "%s | StreamPay",
  },
  description:
    "Stream continuous payments on the Stacks blockchain. Create, manage, and receive STX and sBTC payment streams with milestone-based releases.",
  openGraph: {
    title: "StreamPay — Real-Time Stacks Payments",
    description:
      "Stream continuous payments on the Stacks blockchain. Create, manage, and receive STX and sBTC payment streams.",
    type: "website",
    locale: "en_US",
    siteName: "StreamPay",
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamPay — Real-Time Stacks Payments",
    description:
      "Stream continuous payments on the Stacks blockchain.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${monoFont.variable} font-sans antialiased bg-dark-bg text-white min-h-screen`}
      >
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
