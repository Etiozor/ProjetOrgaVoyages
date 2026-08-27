import { redirect } from "next/navigation";
import { getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { THEMES } from "@/lib/themes";
import { SubmitButton } from "@/components/SubmitButton";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { CapacityStepper } from "@/components/CapacityStepper";
import { DeleteTripSection } from "@/components/DeleteTripSection";
import { setTripTheme, toggleTripFlag, updateTripSettings } from "@/lib/actions";

const TOGGLES: { name: string; label: string; hint?: string }[] = [
  { name: "pageCarpool", label: "Page Voitures" },
  { name: "pageMeals", label: "Page Repas", hint: "les équipes viennent des voitures" },
  { name: "pageTents", label: "Page Tentes" },
  { name: "pageGear", label: "Page Matos" },
  { name: "allowMemberCars", label: "Les participants peuvent déclarer des voitures" },
  { name: "allowMemberTents", label: "Les participants peuvent déclarer des tentes" },
  {
    name: "requireReaction",
    label: "Réaction obligatoire aux annonces",
    hint: "sinon le bandeau de rappel n'apparaît pas",
  },
];

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  if (identity.role !== "admin") redirect(`/t/${tripId}`);
  const trip = (await getTripById(tripId))!;
  const tripFlags = trip as unknown as Record<string, boolean>;
  const delError = (await searchParams).del === "mismatch";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Administration</h1>

      <div className="card flex flex-col gap-2 text-center items-center">
        <p className="eyebrow">Code d&apos;invitation</p>
        <p
          className="font-[family-name:var(--font-oswald)] text-4xl font-bold"
          style={{ color: "var(--accent)", letterSpacing: "0.14em" }}
        >
          {trip.accessCode}
        </p>
        <p className="muted text-xs leading-relaxed">
          Partage ce code au groupe — chacun l&apos;entre dans « Ajouter un voyage ».
        </p>
        <CopyCodeButton code={trip.accessCode} />
      </div>

      <form action={updateTripSettings} className="card flex flex-col gap-2.5">
        <input type="hidden" name="tripId" value={tripId} />
        <p className="eyebrow">Réglages du voyage</p>
        <label className="eyebrow !normal-case !tracking-normal">Nom</label>
        <input name="name" className="input" defaultValue={trip.name} required />
        <label className="eyebrow !normal-case !tracking-normal">Lieu</label>
        <input
          name="location"
          className="input"
          defaultValue={trip.location}
          placeholder="ex. Parc de la Mauricie"
        />
        <label className="eyebrow !normal-case !tracking-normal">Lien Google Maps du lieu</label>
        <input
          name="locationUrl"
          type="url"
          inputMode="url"
          className="input"
          defaultValue={trip.locationUrl}
          placeholder="https://maps.app.goo.gl/…"
        />
        <p className="muted text-xs leading-relaxed">
          Avec un lien, le lieu devient cliquable dans « le voyage d&apos;un coup
          d&apos;œil » et ouvre la carte.
        </p>
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="eyebrow !normal-case !tracking-normal">Participants attendus</label>
            <CapacityStepper name="capacity" defaultValue={trip.capacity} min={1} max={60} />
          </div>
          <SubmitButton className="btn">Enregistrer</SubmitButton>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <p className="eyebrow">Pages &amp; permissions</p>
        <p className="muted text-xs leading-relaxed">
          Désactive les pages inutiles pour ce voyage, et choisis si les participants
          peuvent déclarer eux-mêmes voitures et tentes. Appliqué immédiatement.
        </p>
        {TOGGLES.map((t) => {
          const on = Boolean(tripFlags[t.name]);
          return (
            <form key={t.name} action={toggleTripFlag}>
              <input type="hidden" name="tripId" value={tripId} />
              <input type="hidden" name="flag" value={t.name} />
              <button
                type="submit"
                role="switch"
                aria-checked={on}
                className="w-full text-left flex items-center justify-between gap-3 px-3.5 rounded-[8px]"
                style={{
                  minHeight: 52,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[0.8rem]">{t.label}</span>
                  {t.hint && <span className="muted text-[0.625rem]">{t.hint}</span>}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 flex items-center p-0.5"
                  style={{
                    width: 42,
                    height: 22,
                    borderRadius: 8,
                    background: on ? "var(--accent)" : "var(--card-raised)",
                    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    justifyContent: on ? "flex-end" : "flex-start",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 2,
                      background: on ? "var(--bg)" : "var(--muted)",
                    }}
                  />
                </span>
              </button>
            </form>
          );
        })}
      </div>

      <div className="card flex flex-col gap-2">
        <p className="eyebrow">Thème du voyage</p>
        <p className="muted text-xs">Appliqué à toutes les pages, pour tout le groupe.</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const active = trip.theme === t.id;
            return (
              <form key={t.id} action={setTripTheme}>
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="theme" value={t.id} />
                <button
                  className="w-full px-3 text-sm font-semibold flex items-center justify-between gap-2"
                  style={{
                    minHeight: 48,
                    borderRadius: 8,
                    border: `1px solid ${active ? t.accent : "rgba(0,0,0,.12)"}`,
                    background: "var(--card-raised)",
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block shrink-0"
                      style={{ height: 16, width: 16, borderRadius: 8, background: t.accent }}
                    />
                    {t.label}
                  </span>
                  {active && <span style={{ color: t.accent }}>✓</span>}
                </button>
              </form>
            );
          })}
        </div>
      </div>

      <p className="muted text-xs leading-relaxed">
        Les voitures et les tentes se gèrent désormais directement sur leurs pages —
        chaque carte a un bouton « Gérer » pour la modifier, la supprimer ou en ajouter
        une pour quelqu&apos;un hors de l&apos;app.
      </p>

      <DeleteTripSection tripId={tripId} tripName={trip.name} mismatch={delError} />
    </div>
  );
}
