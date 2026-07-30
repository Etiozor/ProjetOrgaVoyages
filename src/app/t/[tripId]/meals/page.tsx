import { redirect } from "next/navigation";
import { getCars, getParticipants, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { saveMeal } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";

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
      <div>
        <h1 className="text-2xl">Équipes repas</h1>
        <p className="serif !text-base mt-1.5">
          Une équipe = les occupants d&apos;une voiture. Rejoins une voiture pour
          intégrer une équipe.
        </p>
      </div>

      {teams.length === 0 && (
        <p className="muted">Aucune équipe pour l&apos;instant — montez dans des voitures !</p>
      )}

      {teams.map(({ car, members }) => {
        const canEdit =
          members.some((m) => m.id === me.id) ||
          (identity.role === "admin" && !identity.isImpersonating);
        const restrictions = members.filter((m) => m.dietary);
        return (
          <div key={car.id} className="card flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-[family-name:var(--font-oswald)] text-[1rem] font-semibold uppercase tracking-[0.04em] leading-tight">
                Équipe {members.map((m) => m.name).join(" + ")}
              </span>
              <span className="tag shrink-0" style={{ background: "rgba(0,0,0,.06)", color: "var(--muted)" }}>
                {car.label.replace(/^Voiture d[e']\s*/i, "")}
              </span>
            </div>
            {restrictions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {restrictions.map((m) => (
                  <span
                    key={m.id}
                    className="tag"
                    style={{
                      background: "rgba(140,179,105,.15)",
                      color: "#5a7a3a",
                      textTransform: "none",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {m.name} · {m.dietary}
                  </span>
                ))}
              </div>
            )}
            {canEdit ? (
              <form action={saveMeal} className="flex flex-col gap-2.5">
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="carId" value={car.id} />
                <label className="eyebrow">Notre menu</label>
                <textarea
                  name="menu"
                  className="input serif min-h-16 !py-2.5 resize-none"
                  defaultValue={car.menu}
                  placeholder="ex. Chili végé + guacamole, s'mores en dessert"
                />
                <label className="eyebrow">Liste de courses</label>
                <textarea
                  name="shopping"
                  className="input min-h-16 resize-none"
                  defaultValue={car.shopping}
                  placeholder={"- haricots rouges\n- tortillas\n- chamallows"}
                />
                <SubmitButton className="btn self-start">Enregistrer</SubmitButton>
              </form>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <p className="eyebrow">Notre menu</p>
                  <p className="serif !text-base whitespace-pre-wrap">
                    {car.menu || <span className="muted not-italic">Pas encore décidé</span>}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="eyebrow">Liste de courses</p>
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
