import { redirect } from "next/navigation";
import { getCars, getParticipants, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { adminAddCar, declareCar, joinCar, leaveCar } from "@/lib/actions";
import { CapacityStepper } from "@/components/CapacityStepper";
import { CarManage } from "@/components/CarManage";

export default async function CarpoolPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  const trip = (await getTripById(tripId))!;
  if (!trip.pageCarpool) redirect(`/t/${tripId}`);
  const cars = await getCars(tripId);
  const participants = await getParticipants(tripId);
  const me = identity.effective;
  const myCarId = me.carId;
  const canDeclare =
    (trip.allowMemberCars || identity.role === "admin") && !myCarId;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">Covoiturage</h1>
        <p className="serif !text-base mt-1.5">
          Les occupants d&apos;une même voiture forment automatiquement une équipe repas.
        </p>
      </div>

      {canDeclare && (
        <form action={declareCar} className="card-dashed flex flex-col gap-2.5">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="eyebrow">Je prends ma voiture</p>
          <input name="departPlace" className="input" placeholder="Lieu de départ (ex. Montréal, métro Longueuil)" />
          <div className="flex gap-2">
            <input name="departTime" className="input" placeholder="Heure de départ (ex. sam. 8h00)" />
            <input
              name="seats"
              type="number"
              min={1}
              max={9}
              defaultValue={5}
              className="input !w-28"
              placeholder="Places"
              title="Places totales (conducteur inclus)"
              required
            />
          </div>
          <button className="btn self-end">Déclarer ma voiture</button>
        </form>
      )}

      {!trip.allowMemberCars && identity.role !== "admin" && (
        <p className="muted text-xs leading-relaxed">
          L&apos;admin a désactivé l&apos;ajout de voitures par les participants.
        </p>
      )}

      {cars.length === 0 && <p className="muted">Aucune voiture déclarée pour l&apos;instant.</p>}

      {cars.map((car) => {
        const owner = participants.find((p) => p.id === car.ownerId);
        const occupants = participants.filter((p) => p.carId === car.id);
        const free = car.seats - occupants.length;
        const iAmIn = occupants.some((p) => p.id === me.id);
        const iOwnIt = car.ownerId === me.id;
        const canManage = iOwnIt || identity.role === "admin";
        return (
          <div key={car.id} className="card flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-[family-name:var(--font-oswald)] text-[1.05rem] font-semibold uppercase tracking-[0.04em]">
                {car.label}
              </span>
              <span className="tag shrink-0" style={free === 0 ? { background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" } : undefined}>
                {free > 0 ? `${free} libre${free > 1 ? "s" : ""}` : "Complet"}
              </span>
            </div>
            {(car.departPlace || car.departTime) && (
              <p className="text-[0.8rem] muted tracking-[0.03em]">
                {[car.departPlace, car.departTime].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="text-[0.8rem] muted">
              À bord · {occupants.map((p) => p.name).join(", ") || "—"} ({occupants.length}/{car.seats})
              {!owner && " · ajoutée par l'admin"}
            </p>
            {!iAmIn && free > 0 && !myCarId && (
              <form action={joinCar}>
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="carId" value={car.id} />
                <button className="btn">Monter dans cette voiture</button>
              </form>
            )}
            {iAmIn && (
              <form action={leaveCar}>
                <input type="hidden" name="tripId" value={tripId} />
                <button className="btn-ghost" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                  {iOwnIt ? "Annuler ma voiture" : "Descendre de la voiture"}
                </button>
              </form>
            )}
            {canManage && (
              <CarManage
                tripId={tripId}
                car={{
                  id: car.id,
                  label: car.label,
                  departPlace: car.departPlace,
                  departTime: car.departTime,
                  seats: car.seats,
                }}
                declaredBy={owner?.name ?? null}
              />
            )}
          </div>
        );
      })}

      {identity.role === "admin" && (
        <form action={adminAddCar} className="card-dashed flex flex-col gap-2.5">
          <input type="hidden" name="tripId" value={tripId} />
          <p className="eyebrow">Admin · ajouter une voiture</p>
          <p className="muted text-xs leading-relaxed">
            Pour quelqu&apos;un qui n&apos;est pas encore sur l&apos;app.
          </p>
          <input name="label" className="input" placeholder="Nom (ex. Voiture de Max)" required />
          <div className="flex gap-2">
            <input name="departPlace" className="input" placeholder="Lieu de départ" />
            <CapacityStepper name="seats" defaultValue={5} min={1} max={9} />
          </div>
          <input name="departTime" className="input" placeholder="Heure (ex. sam. 8h00)" />
          <button className="btn self-end">Ajouter</button>
        </form>
      )}
    </div>
  );
}
