import type { ReactNode } from "react";
import { fontStyleFor } from "@/lib/announceFonts";

// Balisage léger et SÛR : le texte est découpé en segments, jamais injecté en HTML.
// **gras** → <strong>, _italique_ → <em>. Le reste est rendu tel quel (React échappe).
function parse(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function RichText({
  content,
  font,
  className = "",
}: {
  content: string;
  font: string;
  className?: string;
}) {
  return (
    <p className={`whitespace-pre-wrap ${className}`} style={fontStyleFor(font)}>
      {parse(content)}
    </p>
  );
}
