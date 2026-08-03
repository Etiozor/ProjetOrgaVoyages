import { redirect } from "next/navigation";
import { getCars, getParticipants, getTents, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { THEMES } from "@/lib/themes";
import { SubmitButton } from "@/components/SubmitButton";
import {
  adminAddCar,
  adminAddTent,
  deleteCar,
  deleteTent,
  setTripTheme,
  updateCar,
  updateTent,
  updateTripSettings,
  updateTripToggles,
} from "@/lib/actions";

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
}: {
  params: Promise<{ tripId: string }>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  if (identity.role !== "admin") redirect(`/t/${tripId}`);
  const trip = (await getTripById(tripId))!;
  const cars = await getCars(tripId);
  const tents = await getTents(tripId);
  const participants = await getParticipants(tripId);
  const tripFlags = trip as unknown as Record<string, boolean>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Administration</h1>

      <div className="card flex flex-col gap-1.5 text-center">
        <p className="eyebrow">Code d&apos;invitation</p>
        <p
          className="font-[family-name:var(--font-oswald)] text-4xl font-bold"
          style={{ color: "var(--accent)", letterSpacing: "0.14em" }}
        >
          {trip.accessCode}
        </p>
        <p className="muted text-xs">
          Partage ce code au groupe — chacun l&apos;entre dans « Ajouter un voyage ».
        </p>
      </div>

      <form action={updateTripSettings} className="card flex flex-col gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <p className="eyebrow">Réglages du voyage</p>
        <label className="eyebrow">Nom</label>
        <input name="name" className="input" defaultValue={trip.name} required />
        <label className="eyebrow">Lieu</label>
        <input
          name="location"
          className="input"
          defaultValue={trip.location}
          placeholder="ex. Parc de la Mauricie"
        />
        <label className="eyebrow">Lien Google Maps du lieu</label>
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
        <label className="eyebrow">Participants attendus</label>
        <input
          name="capacity"
          type="number"
          min={1}
          defaultValue={trip.capacity}
          className="input !w-28"
        />
        <SubmitButton className="btn self-end">Enregistrer</SubmitButton>
      </form>

      <form action={updateTripToggles} className="card flex flex-col gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <p className="eyebrow">Pages &amp; permissions</p>
        <p className="muted text-xs">
          Désactive les pages inutiles pour ce voyage, et choisis si les participants
          peuvent déclarer eux-mêmes voitures et tentes.
        </p>
        {TOGGLES.map((t) => (
          <label key={t.name} className="flex items-center gap-2 text-sm py-0.5">
            <input
              type="checkbox"
              name={t.name}
              defaultChecked={tripFlags[t.name]}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {t.label}
            {t.hint && <span className="muted text-xs">({t.hint})</span>}
          </label>
        ))}
        <SubmitButton className="btn self-end">Enregistrer</SubmitButton>
      </form>

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
                    borderRadius: 3,
                    border: `1px solid ${active ? t.accent : "rgba(0,0,0,.12)"}`,
                    background: "var(--card-raised)",
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block shrink-0"
                      style={{ height: 16, width: 16, borderRadius: 3, background: t.accent }}
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

      <div className="flex flex-col gap-2">
        <h2 className="text-lg">Voitures</h2>
        <p className="muted text-xs">
          Les participants déclarent normalement leurs voitures eux-mêmes (page Voitures).
          Ici tu peux tout modifier/supprimer, ou en ajouter pour quelqu&apos;un qui
          n&apos;est pas sur l&apos;app.
        </p>
        {cars.map((car) => {
          const owner = participants.find((p) => p.id === car.ownerId);
          return (
            <div key={car.id} className="card flex flex-col gap-2">
              {owner && <p className="muted text-xs">Déclarée par {owner.name}</p>}
              <form action={updateCar} className="flex flex-col gap-2">
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="carId" value={car.id} />
                <input name="label" className="input" defaultValue={car.label} placeholder="Nom (ex. Voiture de Max)" required />
                <div className="flex gap-2">
                  <input name="departPlace" className="input" defaultValue={car.departPlace} placeholder="Lieu de départ" />
                  <input name="departTime" className="input !w-32" defaultValue={car.departTime} placeholder="Heure" />
                  <input name="seats" type="number" min={1} max={9} className="input !w-20" defaultValue={car.seats} title="Places totales" />
                </div>
                <div className="flex justify-end gap-2">
                  <SubmitButton className="btn-ghost !min-h-0 !py-1 text-xs" savedLabel="✓ Modifié">Modifier</SubmitButton>
                </div>
              </form>
              <form action={deleteCar} className="self-end">
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="carId" value={car.id} />
                <button className="btn-ghost !min-h-0 !py-1 text-xs" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                  Supprimer
                </button>
              </form>
            </div>
          );
        })}
        <form action={adminAddCar} className="card flex flex-col gap-2">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="eyebrow">Ajouter une voiture</p>
          <input name="label" className="input" placeholder="Nom (ex. Voiture de Max)" required />
          <div className="flex gap-2">
            <input name="departPlace" className="input" placeholder="Lieu de départ" />
            <input name="departTime" className="input !w-32" placeholder="Heure" />
            <input name="seats" type="number" min={1} max={9} defaultValue={5} className="input !w-20" title="Places totales" />
          </div>
          <button className="btn self-end">Ajouter</button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg">Tentes</h2>
        <p className="muted text-xs">
          Même principe : les participants déclarent leurs tentes (page Tentes), tu peux
          tout gérer ici.
        </p>
        {tents.map((tent) => {
          const owner = participants.find((p) => p.id === tent.ownerId);
          return (
            <div key={tent.id} className="card flex flex-col gap-2">
              {owner && <p className="muted text-xs">Déclarée par {owner.name}</p>}
              <form action={updateTent} className="flex gap-2">
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="tentId" value={tent.id} />
                <input name="label" className="input" defaultValue={tent.label} placeholder="Nom (ex. Quechua 4p)" required />
                <input name="capacity" type="number" min={1} max={12} className="input !w-20" defaultValue={tent.capacity} title="Places" />
                <SubmitButton className="btn-ghost !min-h-0 !py-1 text-xs shrink-0" savedLabel="✓ Modifié">Modifier</SubmitButton>
              </form>
              <form action={deleteTent} className="self-end">
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="tentId" value={tent.id} />
                <button className="btn-ghost !min-h-0 !py-1 text-xs" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                  Supprimer
                </button>
              </form>
            </div>
          );
        })}
        <form action={adminAddTent} className="card flex flex-col gap-2">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="eyebrow">Ajouter une tente</p>
          <div className="flex gap-2">
            <input name="label" className="input" placeholder="Nom (ex. Quechua 4p)" required />
            <input name="capacity" type="number" min={1} max={12} defaultValue={4} className="input !w-20" title="Places" />
          </div>
          <button className="btn self-end">Ajouter</button>
        </form>
      </div>
    </div>
  );
}
