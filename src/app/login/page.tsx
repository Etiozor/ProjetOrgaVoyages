import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { loginWithPhone, registerUser } from "@/lib/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  // Destination post-connexion (ex. lien d'invitation /join?code=…). On ne
  // suit que les chemins internes relatifs — anti open-redirect.
  const nextRaw = params.next ?? "";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "";
  const user = await currentUser();
  if (user) redirect(next || "/");

  const step = params.step ?? "phone";
  const error = params.error;
  const phone = params.phone ?? "";

  return (
    <div className="mx-auto max-w-sm px-6 pt-10 pb-16 flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <span
          className="font-[family-name:var(--font-oswald)] text-[0.95rem] font-bold uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          TRIP&apos;IN
        </span>
        <span className="eyebrow">
          {step === "name" ? "Inscription" : "Connexion"}
        </span>
      </div>

      {step === "phone" && (
        <>
          <div>
            <div className="eyebrow">Organisation de voyages entre amis</div>
            <hr className="rule" />
            <p className="serif">
              Tes voyages te suivent — il te faut juste ton numéro.
            </p>
          </div>

          <form action={loginWithPhone} className="card flex flex-col gap-3">
            {next && <input type="hidden" name="next" value={next} />}
            <label className="eyebrow">Ton numéro de cellulaire</label>
            <input
              name="phone"
              className="input"
              type="tel"
              placeholder="514 555 0199"
              autoFocus
              required
            />
            {error === "phone" && (
              <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
                Ce numéro ne semble pas valide, réessaie.
              </p>
            )}
            <button className="btn w-full">Continuer</button>
            <p className="muted text-xs leading-relaxed">
              Pas de mot de passe. Ton numéro retrouve tous tes voyages ; tu rejoins un
              voyage avec le code partagé par son admin.
            </p>
          </form>
        </>
      )}

      {step === "name" && (
        <form action={registerUser} className="flex flex-col gap-5">
          <input type="hidden" name="phone" value={phone} />
          {next && <input type="hidden" name="next" value={next} />}
          <h1 className="text-2xl">Se présenter</h1>
          <p className="serif">
            Première connexion avec le {phone || "numéro fourni"} — fais-toi connaître
            du groupe.
          </p>
          <div className="card flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="eyebrow">Prénom</label>
              <input
                name="firstName"
                className="input"
                placeholder="Ton prénom"
                defaultValue={params.firstName ?? ""}
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="eyebrow">Nom</label>
              <input
                name="lastName"
                className="input"
                placeholder="Ton nom de famille"
                defaultValue={params.lastName ?? ""}
                required
              />
            </div>
            {error === "name" && (
              <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
                Il nous faut ton prénom et ton nom.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <label className="eyebrow">Courriel</label>
              <input
                name="email"
                className="input"
                type="email"
                placeholder="ex. toi@exemple.com"
                defaultValue={params.email ?? ""}
                required
              />
            </div>
            {error === "email" && (
              <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
                Ce courriel ne semble pas valide, réessaie.
              </p>
            )}
            <p className="muted text-xs leading-relaxed">
              Ton courriel sert uniquement à te prévenir des nouvelles annonces de tes
              voyages.
            </p>
            <button className="btn w-full">C&apos;est parti</button>
          </div>
        </form>
      )}
    </div>
  );
}
