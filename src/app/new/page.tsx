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
    <div className="mx-auto max-w-xl px-5 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="btn-ghost !min-h-0 !px-2 !py-1.5" title="Retour">
          ←
        </Link>
        <h1 className="text-xl">Nouveau voyage</h1>
      </div>

      <form action={createTrip} className="card flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="eyebrow">Nom du voyage *</label>
          <input
            name="name"
            className="input"
            placeholder="ex. Camping 2027"
            autoFocus
            required
          />
          {params.error === "name" && (
            <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
              Il faut au moins un nom.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="eyebrow">Lieu</label>
          <input name="location" className="input" placeholder="ex. Parc de la Mauricie" />
          <input
            name="locationUrl"
            type="url"
            inputMode="url"
            className="input"
            placeholder="Lien Google Maps (facultatif)"
          />
          <p className="muted text-xs leading-relaxed">
            Colle un lien Google Maps du lieu : le nom devient cliquable dans « le voyage
            d&apos;un coup d&apos;œil ».
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-2">
            <label className="eyebrow">Début</label>
            <input name="startDate" type="date" className="input" />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <label className="eyebrow">Fin</label>
            <input name="endDate" type="date" className="input" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="eyebrow">Point de rendez-vous</label>
          <input
            name="meetingPoint"
            className="input"
            placeholder="ex. Stationnement du parc"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="eyebrow">Participants attendus</label>
          <input
            name="capacity"
            type="number"
            min={1}
            defaultValue={10}
            className="input !w-28"
          />
        </div>
        <button className="btn w-full">Créer le voyage</button>
        <p className="muted text-xs leading-relaxed">
          Tu seras l&apos;admin de ce voyage — un code d&apos;invitation sera généré à
          partager avec le groupe.
        </p>
      </form>
    </div>
  );
}
