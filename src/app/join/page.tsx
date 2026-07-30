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
    <div className="mx-auto max-w-xl px-5 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="btn-ghost !min-h-0 !px-2 !py-1.5" title="Retour">
          ←
        </Link>
        <h1 className="text-xl">Rejoindre</h1>
      </div>

      <div className="card">
        <div className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-[0.04em]">
          {trip.name}
        </div>
        {trip.location && <p className="serif !text-base mt-1">{trip.location}</p>}
      </div>

      {error === "taken" && (
        <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
          Ce nom vient d&apos;être pris par quelqu&apos;un d&apos;autre, choisis-en un autre.
        </p>
      )}
      {error === "full" && (
        <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
          Le voyage est complet ({trip.capacity} participants attendus). Vois avec l&apos;admin.
        </p>
      )}

      {unclaimed.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="eyebrow">On t&apos;attend peut-être déjà — qui es-tu ?</p>
          <div className="flex flex-col gap-2">
            {unclaimed.map((p) => (
              <form key={p.id} action={claimParticipant}>
                <input type="hidden" name="code" value={trip.accessCode} />
                <input type="hidden" name="pid" value={p.id} />
                <button className="input flex items-center justify-between text-left w-full cursor-pointer">
                  <span>{p.name}</span>
                  <span style={{ color: "var(--accent)" }}>C&apos;est moi →</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <form action={joinAsNewParticipant}>
        <input type="hidden" name="code" value={trip.accessCode} />
        <button className="btn w-full" disabled={isFull}>
          {unclaimed.length > 0
            ? `Pas dans la liste — je rejoins en tant que ${user.firstName}`
            : `Je rejoins en tant que ${user.firstName}`}
        </button>
      </form>
    </div>
  );
}
