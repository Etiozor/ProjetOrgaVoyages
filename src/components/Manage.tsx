"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Disclosure « ⋯ » de la maquette TRIP'IN Mobile. Le bouton vit dans l'en-tête
 * de la carte (à côté du badge) tandis que le panneau se déplie plus bas ; les
 * deux partagent l'état via ce contexte, sans positionnement absolu. Un
 * `<Manage>` enveloppe les enfants d'UNE carte (voiture, tente, annonce).
 */
const ManageCtx = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
} | null>(null);

export function useManage() {
  const ctx = useContext(ManageCtx);
  if (!ctx) throw new Error("useManage doit être utilisé dans <Manage>");
  return ctx;
}

export function Manage({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <ManageCtx.Provider value={{ open, setOpen }}>{children}</ManageCtx.Provider>;
}

/**
 * Bouton « ⋯ » inline (dans le flux de l'en-tête). `pill` (23px) se place à côté
 * d'un badge (voitures/tentes) ; `square` (30px) sert d'action isolée (annonces).
 */
export function ManageToggle({
  label,
  variant = "pill",
}: {
  label: string;
  variant?: "pill" | "square";
}) {
  const { open, setOpen } = useManage();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      title={label}
      aria-label={label}
      aria-expanded={open}
      className={`shrink-0 flex items-center justify-center gap-[2.5px] rounded-[3px] transition-colors ${
        variant === "square" ? "w-[30px] h-[30px]" : "h-[23px] px-[7px]"
      }`}
      style={{
        border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
        background: open ? "var(--accent-soft)" : "transparent",
        color: open ? "var(--accent)" : "var(--muted)",
      }}
    >
      <span aria-hidden className="w-[2.5px] h-[2.5px] rounded-full bg-current" />
      <span aria-hidden className="w-[2.5px] h-[2.5px] rounded-full bg-current" />
      <span aria-hidden className="w-[2.5px] h-[2.5px] rounded-full bg-current" />
    </button>
  );
}
