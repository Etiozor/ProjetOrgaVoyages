import { redirect } from "next/navigation";
import { getParticipants, getTents, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { adminAddTent, declareTent, joinTent, leaveTent } from "@/lib/actions";
import { TentIcon } from "@/components/TentIcon";
import { CapacityStepper } from "@/components/CapacityStepper";
import { TentManage } from "@/components/TentManage";
import { Manage, ManageToggle } from "@/components/Manage";

function initials(name: string): string {
  return (name.trim().split(/\s+/)[0] || "?").slice(0, 2).toUpperCase();
}

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

      {tents.length === 0 && (
        <p className="muted">Aucune tente déclarée pour l&apos;instant.</p>
      )}

      {tents.map((tent) => {
        const owner = participants.find((p) => p.id === tent.ownerId);
        const occupants = participants.filter((p) => p.tentId === tent.id);
        const free = tent.capacity - occupants.length;
        const iAmIn = occupants.some((p) => p.id === me.id);
        const iOwnIt = tent.ownerId === me.id;
        const canManage = iOwnIt || identity.role === "admin";
        const isFull = free <= 0;
        const size =
          tent.capacity <= 2 ? "petite" : tent.capacity <= 4 ? "familiale" : "grande";
        const descriptor =
          size === "petite" ? "" : size === "familiale" ? "tente familiale" : "grande tente";
        const capLine = `${tent.capacity} place${tent.capacity > 1 ? "s" : ""}${
          descriptor ? ` · ${descriptor}` : ""
        }`;

        return (
          <Manage key={tent.id}>
          <div className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2.5">
              <span className="font-[family-name:var(--font-oswald)] text-[1.05rem] font-semibold uppercase tracking-[0.04em] leading-[1.25] pt-[3px]">
                {tent.label}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="whitespace-nowrap text-[0.625rem] uppercase tracking-[0.1em] px-2 py-1 rounded-[3px]"
                  style={
                    isFull
                      ? { background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }
                      : { background: "var(--accent-soft)", color: "var(--accent)" }
                  }
                >
                  {isFull ? "Complète" : `${free} libre${free > 1 ? "s" : ""}`}
                </span>
                {canManage && <ManageToggle label="Gérer cette tente" />}
              </div>
            </div>

            {/* Grille de places : occupants + emplacements libres (cliquer pour rejoindre) */}
            <div className="flex flex-wrap gap-1.5">
              {occupants.map((p) => {
                const isMe = p.id === me.id;
                return (
                  <span
                    key={p.id}
                    title={isMe ? `${p.name} (toi)` : p.name}
                    className="flex flex-col items-center justify-center gap-0.5"
                    style={{
                      width: 46,
                      height: 52,
                      borderRadius: 3,
                      background: isMe ? "var(--accent)" : "var(--accent-soft)",
                      border: `1px solid ${
                        isMe ? "var(--accent)" : "color-mix(in srgb, var(--accent), transparent 50%)"
                      }`,
                      color: isMe ? "var(--bg)" : "var(--text)",
                    }}
                  >
                    <span className="text-xs font-bold">{initials(p.name)}</span>
                    {isMe && <span className="text-[8px] tracking-[0.06em] opacity-75">toi</span>}
                  </span>
                );
              })}

              {Array.from({ length: Math.max(0, free) }).map((_, i) =>
                !myTentId ? (
                  <form key={`free-${i}`} action={joinTent}>
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="tentId" value={tent.id} />
                    <button
                      type="submit"
                      title="Dormir dans cette tente"
                      className="flex flex-col items-center justify-center gap-0.5"
                      style={{
                        width: 46,
                        height: 52,
                        borderRadius: 3,
                        border: "1px dashed rgba(0,0,0,.2)",
                        color: "var(--muted)",
                        background: "transparent",
                      }}
                    >
                      <span className="text-xs">+</span>
                      <span className="text-[8px] opacity-75">libre</span>
                    </button>
                  </form>
                ) : (
                  <span
                    key={`free-${i}`}
                    className="flex flex-col items-center justify-center gap-0.5"
                    style={{
                      width: 46,
                      height: 52,
                      borderRadius: 3,
                      border: "1px dashed rgba(0,0,0,.2)",
                      color: "var(--muted)",
                    }}
                  >
                    <span className="text-xs">+</span>
                    <span className="text-[8px] opacity-75">libre</span>
                  </span>
                )
              )}
            </div>

            {/* Silhouette de tente selon la capacité */}
            <div className="flex items-end gap-3">
              <TentIcon capacity={tent.capacity} />
              <span className="text-[0.7rem] tracking-[0.05em] muted pb-0.5 whitespace-nowrap">
                {capLine}
              </span>
            </div>

            <p className="text-[0.8rem] muted">
              Dedans · {occupants.map((p) => p.name).join(", ") || "—"} ({occupants.length}/
              {tent.capacity}){!owner && " · ajoutée par l'admin"}
            </p>

            {iAmIn && (
              <form action={leaveTent}>
                <input type="hidden" name="tripId" value={tripId} />
                <button
                  className="btn-ghost self-start"
                  style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                >
                  {iOwnIt ? "Retirer ma tente" : "Quitter la tente"}
                </button>
              </form>
            )}

            {canManage && (
              <TentManage
                tripId={tripId}
                tent={{ id: tent.id, label: tent.label, capacity: tent.capacity }}
                declaredBy={owner?.name ?? null}
              />
            )}
          </div>
          </Manage>
        );
      })}

      {canDeclare && (
        <form action={declareTent} className="card-dashed flex flex-col gap-2.5">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="eyebrow">Je ramène ma tente</p>
          <div className="flex gap-2">
            <input name="label" className="input" placeholder="Nom / modèle (ex. Quechua 4p)" />
            <CapacityStepper name="capacity" defaultValue={4} min={1} max={12} />
          </div>
          <button className="btn self-end">Déclarer ma tente</button>
        </form>
      )}

      {!trip.allowMemberTents && identity.role !== "admin" && (
        <p className="muted text-xs leading-relaxed">
          L&apos;admin a désactivé l&apos;ajout de tentes par les participants.
        </p>
      )}

      {identity.role === "admin" && (
        <form action={adminAddTent} className="card-dashed flex flex-col gap-2.5">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="eyebrow">Admin · ajouter une tente</p>
          <p className="muted text-xs leading-relaxed">
            Pour quelqu&apos;un qui n&apos;est pas encore sur l&apos;app.
          </p>
          <div className="flex gap-2">
            <input name="label" className="input" placeholder="Nom (ex. Quechua 4p)" required />
            <CapacityStepper name="capacity" defaultValue={4} min={1} max={12} />
          </div>
          <button className="btn self-end">Ajouter</button>
        </form>
      )}
    </div>
  );
}
