import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const barlow = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "TRIP'IN",
  description: "Organisation de voyages entre amis",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const theme = store.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="fr" data-theme={theme} className={`${barlow.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
