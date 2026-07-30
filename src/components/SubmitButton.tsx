"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Bouton de soumission avec retour visuel.
 * S'utilise à l'intérieur d'un <form action={serverAction}>.
 * 3 états : repos → « Enregistrement… » (désactivé) → « ✓ Enregistré » (vert, ~1,8 s).
 */
export function SubmitButton({
  children,
  className = "btn",
  savedLabel = "✓ Enregistré",
  pendingLabel = "Enregistrement…",
}: {
  children: ReactNode;
  className?: string;
  savedLabel?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
    } else if (wasPending.current) {
      wasPending.current = false;
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      data-saved={justSaved ? "" : undefined}
      className={`${className} submit-btn`}
    >
      {pending ? pendingLabel : justSaved ? savedLabel : children}
    </button>
  );
}
