import Link from "next/link";
import { requireUser } from "@/lib/session";
import { createTrip } from "@/lib/actions";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  await requireUser();

  return (
    <div className="mx-auto max-w-xl px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="btn-ghost !px-2" title="Retour">←</Link>
        <h1 className="text-xl font-bold">✨ Nouveau voyage</h1>
      </div>

      <form action={createTrip} className="card flex flex-col gap-3">
        <label className="font-semibold text-sm">Nom du voyage *</label>
        <input name="name" className="input" placeholder="ex. Camping 2027" autoFocus required />
        {params.error === "name" && (
          <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
            Il faut au moins un nom.
          </p>
        )}
        <label className="font-semibold text-sm">Lieu</label>
        <input name="location" className="input" placeholder="ex. Parc de la Mauricie" />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="font-semibold text-sm">Début</label>
            <input name="startDate" type="date" className="input" />
          </div>
          <div className="flex-1">
            <label className="font-semibold text-sm">Fin</label>
            <input name="endDate" type="date" className="input" />
          </div>
        </div>
        <label className="font-semibold text-sm">Point de rendez-vous</label>
        <input name="meetingPoint" className="input" placeholder="ex. Stationnement du parc" />
        <label className="font-semibold text-sm">Participants attendus</label>
        <input name="capacity" type="number" min={1} defaultValue={10} className="input !w-28" />
        <button className="btn">Créer le voyage</button>
        <p className="muted text-xs">
          Tu seras l&apos;admin de ce voyage — un code d&apos;invitation sera généré à
          partager avec le groupe.
        </p>
      </form>
    </div>
  );
}
