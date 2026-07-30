import { redirect } from "next/navigation";
import { getCars, getParticipants, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { saveMeal } from "@/lib/actions";

export default async function MealsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  const trip = (await getTripById(tripId))!;
  if (!trip.pageMeals) redirect(`/t/${tripId}`);
  const cars = await getCars(tripId);
  const participants = await getParticipants(tripId);
  const me = identity.effective;

  const teams = cars
    .map((car) => ({
      car,
      members: participants.filter((p) => p.carId === car.id),
    }))
    .filter((t) => t.members.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">🍲 Équipes repas</h1>
      <p className="muted text-sm">
        Une équipe = les occupants d&apos;une voiture. Rejoins une voiture sur la page
        Covoiturage pour intégrer une équipe.
      </p>

      {teams.length === 0 && (
        <p className="muted">Aucune équipe pour l&apos;instant — montez dans des voitures !</p>
      )}

      {teams.map(({ car, members }) => {
        const canEdit =
          members.some((m) => m.id === me.id) ||
          (identity.role === "admin" && !identity.isImpersonating);
        const restrictions = members.filter((m) => m.dietary);
        return (
          <div key={car.id} className="card flex flex-col gap-2">
            <span className="font-bold">
              Équipe {members.map((m) => m.name).join(" + ")}
            </span>
            <span className="muted text-xs">🚗 {car.label}</span>
            {restrictions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {restrictions.map((m) => (
                  <span key={m.id} className="tag">
                    🥗 {m.name} : {m.dietary}
                  </span>
                ))}
              </div>
            )}
            {canEdit ? (
              <form action={saveMeal} className="flex flex-col gap-2">
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="carId" value={car.id} />
                <label className="font-semibold text-sm">Notre menu</label>
                <textarea
                  name="menu"
                  className="input min-h-16"
                  defaultValue={car.menu}
                  placeholder="ex. Chili végé + guacamole, s'mores en dessert"
                />
                <label className="font-semibold text-sm">Liste de courses</label>
                <textarea
                  name="shopping"
                  className="input min-h-16"
                  defaultValue={car.shopping}
                  placeholder={"- haricots rouges\n- tortillas\n- chamallows"}
                />
                <button className="btn self-end">Enregistrer</button>
              </form>
            ) : (
              <>
                <div>
                  <p className="font-semibold text-sm">Menu</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {car.menu || <span className="muted">Pas encore décidé</span>}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Courses</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {car.shopping || <span className="muted">Pas encore de liste</span>}
                  </p>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
