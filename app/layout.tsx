import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

/**
 * Korijenski layout drzi samo <html>/<body> i font.
 *
 * Zaglavlje i podnozje shopa su u `app/(shop)/layout.tsx`, da ih CMS
 * pod /admin ne bi naslijedio.
 */

// latin-ext je obavezan zbog naših slova: č ć đ š ž
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSettings();

  return {
    metadataBase: process.env.SITE_URL
      ? new URL(process.env.SITE_URL)
      : undefined,
    title: {
      default: `${site.name} - ${site.tagline}`,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    openGraph: {
      type: "website",
      locale: "bs_BA",
      siteName: site.name,
      title: `${site.name} - ${site.tagline}`,
      description: site.description,
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bs" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
