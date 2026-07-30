import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { loginWithPhone, registerUser } from "@/lib/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await currentUser();
  if (user) redirect("/");

  const step = params.step ?? "phone";
  const error = params.error;
  const phone = params.phone ?? "";

  return (
    <div className="mx-auto max-w-sm px-4 pt-14">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏕️</div>
        <h1 className="text-2xl font-bold">TRIP&apos;IN</h1>
        <p className="muted text-sm mt-1">
          Tes voyages te suivent — il te faut juste ton numéro.
        </p>
      </div>

      {step === "phone" && (
        <form action={loginWithPhone} className="card flex flex-col gap-3">
          <label className="font-semibold text-sm">Ton numéro de cellulaire</label>
          <input
            name="phone"
            className="input"
            type="tel"
            placeholder="ex. 514 555 0199"
            autoFocus
            required
          />
          {error === "phone" && (
            <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
              Ce numéro ne semble pas valide, réessaie.
            </p>
          )}
          <button className="btn">Continuer</button>
          <p className="muted text-xs">
            Pas de mot de passe : ton numéro retrouve tous tes voyages. Tu rejoins un
            voyage avec le code partagé par son admin.
          </p>
        </form>
      )}

      {step === "name" && (
        <form action={registerUser} className="card flex flex-col gap-3">
          <input type="hidden" name="phone" value={phone} />
          <p className="font-semibold">Bienvenue ! 👋</p>
          <p className="muted text-sm">
            Première connexion avec le {phone || "numéro fourni"} — fais-toi connaître
            du groupe.
          </p>
          <label className="font-semibold text-sm">Prénom</label>
          <input
            name="firstName"
            className="input"
            placeholder="Ton prénom"
            defaultValue={params.firstName ?? ""}
            autoFocus
            required
          />
          <label className="font-semibold text-sm">Nom</label>
          <input
            name="lastName"
            className="input"
            placeholder="Ton nom de famille"
            defaultValue={params.lastName ?? ""}
            required
          />
          {error === "name" && (
            <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
              Il nous faut ton prénom et ton nom.
            </p>
          )}
          <label className="font-semibold text-sm">Courriel</label>
          <input
            name="email"
            className="input"
            type="email"
            placeholder="ex. toi@exemple.com"
            defaultValue={params.email ?? ""}
            required
          />
          {error === "email" && (
            <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
              Ce courriel ne semble pas valide, réessaie.
            </p>
          )}
          <p className="muted text-xs">
            📧 Ton courriel sert uniquement à te prévenir des nouvelles annonces de tes
            voyages.
          </p>
          <button className="btn">C&apos;est parti</button>
        </form>
      )}
    </div>
  );
}
