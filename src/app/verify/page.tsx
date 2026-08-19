import { redirect } from "next/navigation";
import { currentUser, isVerificationEnforced } from "@/lib/session";
import { maskEmail } from "@/lib/mask";
import { resendMyVerification, updateMyEmail, logout } from "@/lib/actions";

/**
 * Page de confirmation d'adresse (migration magic link, étape 2). Accessible à
 * un utilisateur connecté mais non vérifié — c'est aussi la cible d'enforcement
 * après la date limite. Deux issues : renvoyer le lien à l'adresse en base, ou
 * la corriger soi-même puis recevoir un nouveau lien.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/");

  const enforced = isVerificationEnforced();
  const sentTo = params.sent;
  const error = params.error;

  return (
    <div className="mx-auto max-w-sm px-6 pt-10 pb-16 flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <span
          className="font-[family-name:var(--font-oswald)] text-[0.95rem] font-bold uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          TRIP&apos;IN
        </span>
        <span className="eyebrow">Vérification</span>
      </div>

      <div>
        <div className="eyebrow">Confirme ton adresse</div>
        <hr className="rule" />
        <p className="serif">
          {enforced
            ? "Pour continuer, confirme l'adresse liée à ton compte. On t'envoie un lien de connexion — un clic et c'est réglé."
            : "Sécurise ton compte en confirmant ton adresse. On t'envoie un lien de connexion — un clic et c'est réglé."}
        </p>
      </div>

      {sentTo && (
        <div className="card flex flex-col gap-2">
          <h1 className="text-xl">Lien envoyé</h1>
          <p className="serif">
            On vient d&apos;envoyer un lien à{" "}
            <span className="not-italic font-semibold">{sentTo}</span>. Clique dessus
            pour confirmer — il est valable 20 minutes.
          </p>
          <p className="muted text-xs leading-relaxed">
            Pas reçu ? Vérifie tes indésirables, ou corrige ton adresse ci-dessous.
          </p>
        </div>
      )}

      {error === "send" && (
        <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
          L&apos;envoi du courriel a échoué. Réessaie dans un instant.
        </p>
      )}

      <form action={resendMyVerification} className="card flex flex-col gap-3">
        <p className="eyebrow">Adresse actuelle</p>
        <p className="text-sm font-semibold">{maskEmail(user.email)}</p>
        <button className="btn w-full">Renvoyer le lien</button>
      </form>

      <form action={updateMyEmail} className="card-dashed flex flex-col gap-3">
        <p className="eyebrow">Ce n&apos;est pas la bonne adresse ?</p>
        <input
          name="email"
          className="input"
          type="email"
          placeholder="ta nouvelle adresse"
          defaultValue=""
          required
        />
        {error === "email" && (
          <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
            Ce courriel ne semble pas valide, réessaie.
          </p>
        )}
        <button className="btn-ghost w-full justify-center">
          Corriger et recevoir un lien
        </button>
        <p className="muted text-xs leading-relaxed">
          Bloqué ? Un admin de l&apos;un de tes voyages peut aussi corriger ton adresse
          depuis la page « Le groupe ».
        </p>
      </form>

      <form action={logout} className="self-center">
        <button
          className="btn-ghost !min-h-0 !px-3 !py-1.5 uppercase !text-[0.65rem] tracking-[0.1em]"
          style={{ color: "var(--muted)", borderColor: "var(--border)" }}
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
