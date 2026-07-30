"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Barre d'onglets du bas — icônes seules (maquette « TRIP'IN Mobile »).
 * Chaque onglet : un repère (barre 18×2 en accent quand actif) au-dessus d'une
 * icône SVG au trait. Fond sable, colonnes calées sur les pages activées.
 * Les tracés SVG sont repris tels quels de la maquette (viewBox 24, trait 1.5).
 */

const ICONS: Record<string, ReactNode> = {
  Annonces: (
    <>
      <path d="M4 9.5v5l9 3.5V6l-9 3.5z" />
      <path d="M13 9.5c2 0 3.2 1.1 3.2 2.5S15 14.5 13 14.5" />
      <path d="M6.5 15.5V19" />
    </>
  ),
  Groupe: (
    <>
      <circle cx="9.5" cy="8.5" r="3" />
      <path d="M4 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17.5" cy="9.5" r="2.1" />
      <path d="M16 14.2c2.6.3 4 2.1 4 4.3" />
    </>
  ),
  Voitures: (
    <>
      <path d="M4 15.5h16" />
      <path d="M5.5 15.5v-3.2l2.2-4.3h8.6l2.2 4.3v3.2" />
      <circle cx="8.2" cy="17.4" r="1.5" />
      <circle cx="15.8" cy="17.4" r="1.5" />
    </>
  ),
  Repas: (
    <>
      <path d="M5 10.5h14v3.9A4 4 0 0 1 15 18.4H9a4 4 0 0 1-4-4V10.5z" />
      <path d="M2.8 12.4h2M19.2 12.4h2" />
      <path d="M9 7.5c0-1.2 1.3-1.4 1.3-2.6M13.5 7.5c0-1.2 1.3-1.4 1.3-2.6" />
    </>
  ),
  Tentes: (
    <>
      <path d="M12 5L3.2 18.5h17.6L12 5z" />
      <path d="M12 5v13.5" />
      <path d="M9 18.5L12 12l3 6.5" />
    </>
  ),
  Matos: (
    <>
      <path d="M8.5 8.5V6.8a3.5 3.5 0 0 1 7 0v1.7" />
      <rect x="5.5" y="8.5" width="13" height="10.5" rx="2.4" />
      <path d="M9.5 13.5h5" />
    </>
  ),
  Admin: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.6 6.6l1.4 1.4M16 16l1.4 1.4M17.4 6.6l-1.4 1.4M8 16l-1.4 1.4" />
    </>
  ),
};

export function TabBar({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t"
      style={{ background: "var(--card)", borderColor: "var(--hair)" }}
    >
      <div
        className="mx-auto max-w-xl grid"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          padding: "6px 6px 20px",
        }}
      >
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className="flex flex-col items-center justify-center gap-1.5"
              style={{ minHeight: 48, color: active ? "var(--accent)" : "var(--muted)" }}
            >
              <span
                aria-hidden
                style={{
                  width: 18,
                  height: 2,
                  background: active ? "var(--accent)" : "transparent",
                }}
              />
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ICONS[item.label] ?? null}
              </svg>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
