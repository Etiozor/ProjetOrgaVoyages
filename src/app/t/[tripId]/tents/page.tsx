import { redirect } from "next/navigation";
import { getParticipants, getTents, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { declareTent, joinTent, leaveTent } from "@/lib/actions";

export default async function TentsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  const trip = (await getTripById(tripId))!;
  if (!trip.pageTents) redirect(`/t/${tripId}`);
  const tents = await getTents(tripId);
  const participants = await getParticipants(tripId);
  const me = identity.effective;
  const myTentId = me.tentId;
  const canDeclare =
    (trip.allowMemberTents || identity.role === "admin") && !myTentId;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">Tentes</h1>
        <p className="serif !text-base mt-1.5">
          Qui dort où — chacun déclare sa tente ou rejoint celle d&apos;un ami.
        </p>
      </div>

      {canDeclare && (
        <form action={declareTent} className="card-dashed flex flex-col gap-2.5">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="eyebrow">Je ramène ma tente</p>
          <div className="flex gap-2">
            <input name="label" className="input" placeholder="Nom / modèle (ex. Quechua 4p)" />
            <input
              name="capacity"
              type="number"
              min={1}
              max={12}
              defaultValue={4}
              className="input !w-28"
              placeholder="Places"
              required
            />
          </div>
          <button className="btn self-end">Déclarer ma tente</button>
        </form>
      )}

      {!trip.allowMemberTents && identity.role !== "admin" && (
        <p className="muted text-xs leading-relaxed">
          L&apos;admin a désactivé l&apos;ajout de tentes par les participants.
        </p>
      )}

      {tents.length === 0 && <p className="muted">Aucune tente déclarée pour l&apos;instant.</p>}

      {tents.map((tent) => {
        const owner = participants.find((p) => p.id === tent.ownerId);
        const occupants = participants.filter((p) => p.tentId === tent.id);
        const free = tent.capacity - occupants.length;
        const iAmIn = occupants.some((p) => p.id === me.id);
        const iOwnIt = tent.ownerId === me.id;
        return (
          <div key={tent.id} className="card flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-[family-name:var(--font-oswald)] text-[1.05rem] font-semibold uppercase tracking-[0.04em]">
                {tent.label}
              </span>
              <span className="tag shrink-0" style={free === 0 ? { background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" } : undefined}>
                {free > 0 ? `${free} libre${free > 1 ? "s" : ""}` : "Complète"}
              </span>
            </div>
            <p className="text-[0.8rem] muted">
              Dedans · {occupants.map((p) => p.name).join(", ") || "—"} ({occupants.length}/{tent.capacity})
              {!owner && " · ajoutée par l'admin"}
            </p>
            {!iAmIn && free > 0 && !myTentId && (
              <form action={joinTent}>
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="tentId" value={tent.id} />
                <button className="btn">Dormir dans cette tente</button>
              </form>
            )}
            {iAmIn && (
              <form action={leaveTent}>
                <input type="hidden" name="tripId" value={tripId} />
                <button className="btn-ghost" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                  {iOwnIt ? "Retirer ma tente" : "Quitter la tente"}
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
