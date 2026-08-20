import {
  getCars,
  getParticipantPhotos,
  getParticipants,
  getTents,
  getTripById,
} from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import {
  addParticipant,
  confirmParticipant,
  demoteAdmin,
  promoteToAdmin,
  removeParticipant,
  updateDietary,
} from "@/lib/actions";
import { PhotoUpload } from "@/components/PhotoUpload";

function initials(name: string): string {
  return (name.trim().split(/\s+/)[0] || "?").slice(0, 2).toUpperCase();
}

// « Voiture de Max » / « Voiture d'Étienne » → « Max » / « Étienne » (comme la maquette).
function shortCar(label: string): string {
  return label.replace(/^voiture d(?:e |')/i, "").trim() || label;
}

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
  const tents = await getTents(tripId);
  const photos = new Map(
    (await getParticipantPhotos(tripId)).map((x) => [x.id, x.photo])
  );
  const confirmed = participants.filter((p) => p.isConfirmed).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl">Le groupe</h1>
        <span className="muted text-[0.7rem] tracking-[0.05em]">
          {confirmed} confirmés · {participants.length}/{trip.capacity} attendus
        </span>
      </div>

      {identity.role === "admin" && (
        <div className="card-dashed flex flex-col gap-3">
          <p className="eyebrow">Ajouter quelqu&apos;un (pas encore sur l&apos;app)</p>
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

      <div className="card flex flex-col gap-3.5">
        <p className="eyebrow">Mon profil ({identity.effective.name})</p>

        <PhotoUpload
          tripId={tripId}
          name={identity.effective.name}
          photo={identity.effective.photo}
        />

        <form action={updateDietary} className="flex flex-col gap-1.5">
          <input type="hidden" name="tripId" value={tripId} />
          <label className="muted text-[0.7rem] tracking-[0.05em]">
            Mes restrictions alimentaires
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
      </div>

      <div className="flex flex-col gap-2">
        {participants.map((p) => {
          const car = cars.find((c) => c.id === p.carId);
          const tent = tents.find((t) => t.id === p.tentId);
          const isMe = p.id === identity.effective.id;
          const photo = photos.get(p.id);
          const isAdminRole = p.role === "admin";
          const isAdminViewer = identity.role === "admin";
          const statusLabel = p.isConfirmed
            ? "Confirmé"
            : p.userId
              ? "En attente"
              : "Pas sur l'app";
          return (
            <div
              key={p.id}
              className="card !py-3.5 flex items-start gap-3"
              style={{ borderLeft: `6px solid ${isMe ? "var(--accent)" : "var(--hair)"}` }}
            >
              {/* Avatar : photo de profil si présente, sinon initiales (sarcelle si c'est toi) */}
              <span
                aria-hidden
                className="flex items-center justify-center shrink-0 overflow-hidden text-sm font-bold"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: photo
                    ? "transparent"
                    : isMe
                      ? "var(--accent)"
                      : "rgba(0,0,0,.06)",
                  color: isMe ? "var(--bg)" : "var(--muted)",
                }}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  initials(p.name)
                )}
              </span>

              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* Nom + rôle + statut */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{p.name}</span>
                  {isAdminRole && (
                    <span
                      className="rounded-[8px] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.1em]"
                      style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
                    >
                      Admin
                    </span>
                  )}
                  <span
                    className="rounded-[8px] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.1em]"
                    style={
                      p.isConfirmed
                        ? { background: "rgba(140,179,105,.15)", color: "#5a7a3a" }
                        : {
                            background: "transparent",
                            border: "1px solid var(--border)",
                            color: "var(--muted)",
                          }
                    }
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Voiture (= équipe repas) & tente */}
                <div className="flex flex-col gap-0.5 text-[0.7rem] tracking-[0.03em] muted">
                  <span>
                    <span className="font-bold" style={{ color: "var(--text)" }}>
                      Voiture
                    </span>{" "}
                    · {car ? shortCar(car.label) : "—"}
                  </span>
                  <span>
                    <span className="font-bold" style={{ color: "var(--text)" }}>
                      Tente
                    </span>{" "}
                    · {tent ? tent.label : "—"}
                  </span>
                </div>

                {/* Régime alimentaire */}
                {p.dietary && (
                  <span
                    className="self-start rounded-[8px] px-[7px] py-[3px] text-[0.7rem]"
                    style={{ background: "rgba(140,179,105,.15)", color: "#5a7a3a" }}
                  >
                    {p.dietary}
                  </span>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5">
                  {!p.isConfirmed && (
                    <form action={confirmParticipant}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="pid" value={p.id} />
                      <button className="btn !min-h-0 !py-1 !px-2.5 text-xs">
                        {isMe ? "Je confirme" : "Confirmer"}
                      </button>
                    </form>
                  )}
                  {isAdminViewer && !isAdminRole && (
                    <form action={promoteToAdmin}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="pid" value={p.id} />
                      <button className="btn-ghost !min-h-0 !py-1 !px-2.5 text-xs">
                        Nommer admin
                      </button>
                    </form>
                  )}
                  {isAdminViewer && isAdminRole && p.id !== identity.participant.id && (
                    <form action={demoteAdmin}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="pid" value={p.id} />
                      <button
                        className="btn-ghost !min-h-0 !py-1 !px-2.5 text-xs"
                        style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                      >
                        Retirer admin
                      </button>
                    </form>
                  )}
                  {isAdminViewer && !isAdminRole && (
                    <form action={removeParticipant}>
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="pid" value={p.id} />
                      <button
                        className="btn-ghost !min-h-0 !py-1 !px-2.5 text-xs"
                        style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                      >
                        Retirer
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
