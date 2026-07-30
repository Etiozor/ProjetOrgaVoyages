import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getParticipantByUser,
  getParticipants,
  getTripByCode,
  getUnclaimedParticipants,
} from "@/lib/db";
import { requireUser } from "@/lib/session";
import { claimParticipant, joinAsNewParticipant } from "@/lib/actions";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const code = params.code ?? "";
  const trip = code ? await getTripByCode(code) : null;
  if (!trip) redirect("/?error=code");
  if (await getParticipantByUser(trip.id, user.id)) redirect(`/t/${trip.id}`);

  const unclaimed = await getUnclaimedParticipants(trip.id);
  const isFull = (await getParticipants(trip.id)).length >= trip.capacity;
  const error = params.error;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="btn-ghost !px-2" title="Retour">←</Link>
        <h1 className="text-xl font-bold">Rejoindre un voyage</h1>
      </div>

      <div className="card">
        <p className="font-bold">🏕️ {trip.name}</p>
        {trip.location && <p className="muted text-sm">{trip.location}</p>}
      </div>

      {error === "taken" && (
        <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
          Ce nom vient d&apos;être pris par quelqu&apos;un d&apos;autre, choisis-en un autre.
        </p>
      )}
      {error === "full" && (
        <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
          Le voyage est complet ({trip.capacity} participants attendus). Vois avec l&apos;admin.
        </p>
      )}

      {unclaimed.length > 0 && (
        <div className="card flex flex-col gap-2">
          <p className="font-semibold text-sm">On t&apos;attend peut-être déjà — qui es-tu ?</p>
          <div className="flex flex-col gap-2">
            {unclaimed.map((p) => (
              <form key={p.id} action={claimParticipant}>
                <input type="hidden" name="code" value={trip.accessCode} />
                <input type="hidden" name="pid" value={p.id} />
                <button className="btn-ghost w-full !justify-start">{p.name}</button>
              </form>
            ))}
          </div>
        </div>
      )}

      <form action={joinAsNewParticipant} className="card flex flex-col gap-2">
        <input type="hidden" name="code" value={trip.accessCode} />
        <p className="font-semibold text-sm">
          {unclaimed.length > 0 ? "Pas dans la liste ?" : "Prêt à embarquer ?"}
        </p>
        <button className="btn" disabled={isFull}>
          Je rejoins en tant que {user.firstName}
        </button>
      </form>
    </div>
  );
}
