"use client";

import { useEffect, useRef, useState } from "react";
import { removePhoto, setPhoto } from "@/lib/actions";

function initials(name: string): string {
  return (name.trim().split(/\s+/)[0] || "?").slice(0, 2).toUpperCase();
}

// Redimensionne l'image côté client (max NxN, JPEG) → data URL légère.
// Évite toute dépendance serveur (sharp) et garde la base compacte.
function resizeImage(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponible"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    img.src = url;
  });
}

/**
 * Photo de profil de l'utilisateur courant. Aperçu + « Changer la photo ».
 * Le fichier est réduit à 256 px avant envoi ; la data URL part dans setPhoto.
 */
export function PhotoUpload({
  tripId,
  name,
  photo,
}: {
  tripId: number;
  name: string;
  photo: string;
}) {
  const [preview, setPreview] = useState(photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dataRef = useRef<HTMLInputElement>(null);

  // Re-synchronise l'aperçu quand le serveur renvoie une nouvelle valeur.
  useEffect(() => setPreview(photo), [photo]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // autorise re-sélection du même fichier
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      const url = await resizeImage(file, 256, 0.82);
      setPreview(url);
      if (dataRef.current) dataRef.current.value = url;
      formRef.current?.requestSubmit();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} action={setPhoto} className="flex items-center gap-3">
      <input type="hidden" name="tripId" value={tripId} />
      <input ref={dataRef} type="hidden" name="photo" />

      <span
        aria-hidden
        className="flex items-center justify-center shrink-0 overflow-hidden text-base font-bold"
        style={{
          width: 56,
          height: 56,
          borderRadius: 3,
          background: preview ? "transparent" : "var(--accent)",
          color: "var(--bg)",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initials(name)
        )}
      </span>

      <div className="flex flex-col items-start gap-1.5">
        <label className="btn-ghost !min-h-0 !py-1.5 cursor-pointer">
          {busy ? "…" : preview ? "Changer la photo" : "Ajouter une photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
            disabled={busy}
          />
        </label>
        {preview && (
          <button
            type="submit"
            formAction={removePhoto}
            onClick={() => setPreview("")}
            className="btn-ghost !min-h-0 !py-1.5"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
          >
            Retirer
          </button>
        )}
        {error && (
          <span className="text-xs" style={{ color: "var(--danger)" }}>
            Image illisible, réessaie.
          </span>
        )}
      </div>
    </form>
  );
}
