"use client";

import { useRef, useState } from "react";
import { ANNOUNCE_FONTS, fontStyleFor } from "@/lib/announceFonts";

/**
 * Éditeur d'annonce : barre d'outils Gras / Italique + choix de police,
 * avec aperçu live de la police dans le champ. Le formatage est stocké en
 * balisage léger (**gras**, _italique_) rendu ensuite par <RichText>.
 * Sert à la fois à publier et à modifier (passer announcementId + action).
 */
export function AnnouncementComposer({
  tripId,
  action,
  announcementId,
  defaultContent = "",
  defaultFont = "barlow",
  submitLabel = "Publier",
  eyebrow,
  note = "Sélectionne du texte puis Gras / Italique. Un courriel part aux participants ayant fourni leur adresse.",
}: {
  tripId: number;
  action: (formData: FormData) => void | Promise<void>;
  announcementId?: number;
  defaultContent?: string;
  defaultFont?: string;
  submitLabel?: string;
  eyebrow?: string;
  note?: string;
}) {
  const [value, setValue] = useState(defaultContent);
  const [font, setFont] = useState(defaultFont);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Entoure la sélection courante (ou insère un gabarit) avec le marqueur donné.
  function wrap(marker: string) {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const sel = value.slice(start, end) || "texte";
    setValue(value.slice(0, start) + marker + sel + marker + value.slice(end));
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.selectionStart = start + marker.length;
      ta.selectionEnd = start + marker.length + sel.length;
    });
  }

  return (
    <form action={action} className="card flex flex-col gap-2.5">
      <input type="hidden" name="tripId" value={tripId} />
      {announcementId != null && (
        <input type="hidden" name="announcementId" value={announcementId} />
      )}

      {eyebrow && <span className="eyebrow">{eyebrow}</span>}

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => wrap("**")}
          title="Gras (**texte**)"
          className="btn-ghost !min-h-0 !py-1 !px-2.5 font-bold"
        >
          G
        </button>
        <button
          type="button"
          onClick={() => wrap("_")}
          title="Italique (_texte_)"
          className="btn-ghost !min-h-0 !py-1 !px-2.5 italic"
        >
          I
        </button>
        <label className="sr-only" htmlFor={`font-${announcementId ?? "new"}`}>
          Police
        </label>
        <select
          id={`font-${announcementId ?? "new"}`}
          name="font"
          value={font}
          onChange={(e) => setFont(e.target.value)}
          title="Police"
          className="input !min-h-0 !w-auto !py-1 text-sm"
        >
          {ANNOUNCE_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        ref={ref}
        name="content"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Écris ton annonce…"
        required
        className="input min-h-24 !py-2.5 resize-none"
        style={{ ...fontStyleFor(font), fontSize: "1rem", lineHeight: 1.5 }}
      />

      <div className="flex items-center justify-between gap-3">
        <span className="muted text-[0.65rem] leading-snug">{note}</span>
        <button className="btn shrink-0">{submitLabel}</button>
      </div>
    </form>
  );
}
