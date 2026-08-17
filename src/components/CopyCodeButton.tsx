"use client";

import { useState } from "react";

/**
 * Bouton « Copier le code » de la maquette (Administration).
 * Copie le code d'invitation dans le presse-papiers et affiche « Copié ✓ »
 * un court instant. Repli sur une sélection si l'API Clipboard est indisponible.
 */
export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Navigateur sans presse-papiers (ou hors contexte sécurisé) : on ne casse rien.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="btn-ghost !min-h-0 py-2 text-xs"
      style={
        copied
          ? { color: "var(--ok)", borderColor: "var(--ok)" }
          : undefined
      }
    >
      {copied ? "Copié ✓" : "Copier le code"}
    </button>
  );
}
