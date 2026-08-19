import Link from "next/link";
import { currentUser, isVerificationEnforced } from "@/lib/session";
import { maskEmail } from "@/lib/mask";
import { resendMyVerification } from "@/lib/actions";

/**
 * Bandeau de rappel de vérification, affiché tant que le compte connecté n'a pas
 * confirmé son adresse (migration douce vers le magic link). Informatif avant la
 * date limite, plus insistant une fois l'échéance atteinte. Rendu côté serveur :
 * invisible pour un visiteur non connecté ou déjà vérifié — donc absent de
 * /login. Sur /verify il double la page ; c'est sans conséquence.
 */
export async function VerifyEmailBanner() {
  const user = await currentUser();
  if (!user || user.emailVerifiedAt) return null;

  const enforced = isVerificationEnforced();
  const INK = "#2b2b2b";
  const CREAM = "#fdf8e8";
  const AMBER = "#b5852f";

  return (
    <div
      role="region"
      aria-label="Vérification de l'adresse e-mail"
      style={{
        background: enforced ? "#7a2e2e" : INK,
        color: CREAM,
        borderBottom: "1px solid rgba(255,255,255,.14)",
      }}
    >
      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-x-2.5 gap-y-1.5 px-4 py-2">
        <p className="min-w-0 flex-1 text-[0.72rem] font-medium leading-snug tracking-[0.02em]">
          {enforced
            ? "Confirme ton adresse pour garder l'accès à tes voyages — "
            : "Sécurise ton compte : confirme ton adresse "}
          <span className="font-semibold not-italic">{maskEmail(user.email)}</span>.
        </p>

        <form action={resendMyVerification} className="shrink-0">
          <button
            type="submit"
            className="px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.06em]"
            style={{ background: AMBER, color: CREAM, borderRadius: "8px" }}
          >
            Renvoyer le lien
          </button>
        </form>

        <Link
          href="/verify"
          className="shrink-0 px-1.5 py-1 text-[0.7rem] font-medium underline underline-offset-2"
          style={{ color: "rgba(253,248,232,.85)" }}
        >
          Corriger mon adresse
        </Link>
      </div>
    </div>
  );
}
