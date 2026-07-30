import { getCars, getParticipants, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import {
  addParticipant,
  confirmParticipant,
  demoteAdmin,
  promoteToAdmin,
  removeParticipant,
  updateDietary,
} from "@/lib/actions";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  const trip = (await getTripById(tripId))!;
  const participants = await getParticipants(tripId);
  const cars = await getCars(tripId);
  const confirmed = participants.filter((p) => p.isConfirmed).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">👥 Le groupe</h1>
        <span className="muted text-sm">
          {confirmed} confirmés · {participants.length}/{trip.capacity} attendus
        </span>
      </div>

      {identity.role === "admin" && (
        <div className="card flex flex-col gap-3">
          <p className="font-semibold text-sm">Ajouter quelqu&apos;un (pas encore sur l&apos;app)</p>
          <form action={addParticipant} className="flex gap-2">
            <input type="hidden" name="tripId" value={tripId} />
            <input name="name" className="input" placeholder="Nom du participant" required />
            <button
              className="btn-ghost shrink-0"
              disabled={participants.length >= trip.capacity}
            >
              Ajouter
            </button>
          </form>
          {participants.length >= trip.capacity && (
            <p className="text-xs font-semibold" style={{ color: "var(--danger)" }}>
              Les {trip.capacity} places attendues sont remplies (modifiable dans Admin).
            </p>
          )}
        </div>
      )}

      <form action={updateDietary} className="card flex flex-col gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <label className="font-semibold text-sm">
          Mes restrictions alimentaires ({identity.effective.name})
        </label>
        <div className="flex gap-2">
          <input
            name="dietary"
            className="input"
            defaultValue={identity.effective.dietary}
            placeholder="ex. végétarien, sans gluten…"
          />
          <button className="btn-ghost shrink-0">OK</button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {participants.map((p) => {
          const car = cars.find((c) => c.id === p.carId);
          const team = car
            ? participants.filter((x) => x.carId === car.id).map((x) => x.name)
            : null;
          return (
            <div key={p.id} className="card !py-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {p.name}
                  {p.role === "admin" && <span className="tag ml-2">👑 Admin</span>}
                </span>
                <div className="flex items-center gap-2">
                  {p.isConfirmed ? (
                    <span className="tag">✅ Confirmé</span>
                  ) : (
                    <>
                      <span className="tag" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>
                        En attente
                      </span>
                      <form action={confirmParticipant}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="pid" value={p.id} />
                        <button className="btn !py-1 !px-2.5 text-xs">
                          {identity.effective.id === p.id ? "Je confirme !" : "Confirmer"}
                        </button>
                      </form>
                    </>
                  )}
                  {identity.role === "admin" && p.role !== "admin" && (
                    <form action={removeParticipant}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="pid" value={p.id} />
                      <button className="btn-ghost !py-1 !px-2 text-xs" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                        Retirer
                      </button>
                    </form>
                  )}
                </div>
              </div>
              {identity.role === "admin" && (
                <div className="flex justify-end">
                  {p.role !== "admin" ? (
                    <form action={promoteToAdmin}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="pid" value={p.id} />
                      <button className="btn-ghost !py-1 !px-2 text-xs">
                        👑 Nommer admin
                      </button>
                    </form>
                  ) : (
                    p.id !== identity.participant.id && (
                      <form action={demoteAdmin}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="pid" value={p.id} />
                        <button className="btn-ghost !py-1 !px-2 text-xs" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                          Retirer le rôle admin
                        </button>
                      </form>
                    )
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {!p.userId && <span className="muted">⏳ pas encore sur l&apos;app</span>}
                {p.dietary && <span className="tag">🥗 {p.dietary}</span>}
                {p.isConfirmed && p.confirmedBy && p.confirmedBy !== p.name && (
                  <span className="muted">confirmé par {p.confirmedBy}</span>
                )}
                {team && (
                  <span className="tag">🍲 Équipe repas : {team.join(" + ")}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
