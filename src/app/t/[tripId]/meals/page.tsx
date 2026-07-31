import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCars,
  getMealSlots,
  getParticipants,
  getTripById,
  type MealSlotWithShop,
} from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { MEALS, tripDays } from "@/lib/meals";
import { SubmitButton } from "@/components/SubmitButton";
import {
  addMealShopItem,
  bookMealSlot,
  deleteMealShopItem,
  toggleMealShopItem,
  updateMealMenu,
} from "@/lib/actions";

export default async function MealsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const tripId = Number((await params).tripId);
  const dayParam = (await searchParams).day;
  const identity = await requireTripIdentity(tripId);
  const trip = (await getTripById(tripId))!;
  if (!trip.pageMeals) redirect(`/t/${tripId}`);

  const cars = await getCars(tripId);
  const participants = await getParticipants(tripId);
  const slots = await getMealSlots(tripId);
  const me = identity.effective;
  const isAdmin = identity.role === "admin" && !identity.isImpersonating;

  const days = tripDays(trip.startDate, trip.endDate);
  const selectedDay = Math.min(Math.max(0, Number(dayParam) || 0), days.length - 1);

  // Une équipe = les occupants d'une voiture (comme le covoiturage).
  type Team = {
    car: (typeof cars)[number];
    members: typeof participants;
    label: string;
    initials: string;
    isMine: boolean;
  };
  const teamOf = (carId: number | null): Team | null => {
    if (!carId) return null;
    const car = cars.find((c) => c.id === carId);
    if (!car) return null;
    const members = participants.filter((p) => p.carId === carId);
    if (members.length === 0) return null;
    return {
      car,
      members,
      label: "Équipe " + members.map((m) => m.name).join(" + "),
      initials: members
        .slice(0, 3)
        .map((m) => m.name.charAt(0).toUpperCase())
        .join(""),
      isMine: members.some((m) => m.id === me.id),
    };
  };
  const myTeam = teamOf(me.carId);
  const groupDiets = participants.filter((p) => p.dietary);

  const slotOf = (day: number, meal: number): MealSlotWithShop | null =>
    slots.find((s) => s.day === day && s.meal === meal) ?? null;

  // Couverture globale du week-end (créneaux pourvus / total).
  const totalSlots = days.length * MEALS.length;
  const bookedSlots = slots.filter((s) => s.carId).length;
  const coverAll = bookedSlots >= totalSlots && totalSlots > 0;

  const mealsHref = (di: number) => `/t/${tripId}/meals?day=${di}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">Repas</h1>
        <p className="serif !text-base mt-1.5">
          Trois créneaux par jour. Une équipe — les occupants d&apos;une voiture — prend
          en charge un créneau et cuisine pour tout le groupe.
        </p>
      </div>

      {/* Vue d'ensemble : grille services × jours */}
      <div className="card flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="eyebrow">Planning du week-end</span>
          <span
            className="text-[0.7rem] whitespace-nowrap"
            style={{ color: coverAll ? "var(--accent)" : "var(--warn-bg)" }}
          >
            {bookedSlots}/{totalSlots} créneaux pourvus
          </span>
        </div>
        <div className="overflow-x-auto">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `48px repeat(${days.length}, minmax(52px, 1fr))`,
            }}
          >
            <span />
            {days.map((d) => (
              <span
                key={d.index}
                className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-center muted"
              >
                {d.short}
              </span>
            ))}
            {MEALS.map((m, mi) => (
              <div key={mi} className="contents">
                <span className="text-[0.625rem] uppercase tracking-[0.06em] muted flex items-center">
                  {m.short}
                </span>
                {days.map((d) => {
                  const team = teamOf(slotOf(d.index, mi)?.carId ?? null);
                  const style = team
                    ? team.isMine
                      ? { background: "var(--accent)", color: "var(--bg)", border: "1px solid var(--accent)" }
                      : {
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          border: "1px solid var(--accent-soft)",
                        }
                    : {
                        background: "transparent",
                        color: "#a05a20",
                        border: "1px dashed var(--warn-bg)",
                      };
                  return (
                    <Link
                      key={d.index}
                      href={`${mealsHref(d.index)}#slot-${mi}`}
                      title={`${d.label} · ${m.label} — ${team ? team.label : "personne"}`}
                      className="min-h-10 rounded-[3px] flex items-center justify-center text-[0.7rem] font-semibold tracking-[0.04em]"
                      style={style}
                    >
                      {team ? team.initials : "libre"}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-0.5 text-[0.625rem] muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: "var(--accent)" }} />
            mon équipe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: "var(--accent-soft)" }} />
            autre équipe
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-[2px]"
              style={{ border: "1px dashed var(--warn-bg)" }}
            />
            libre
          </span>
        </div>
      </div>

      {/* Sélecteur de jour */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
      >
        {days.map((d) => {
          const active = d.index === selectedDay;
          const dayBookable = MEALS.length;
          const dayBooked = MEALS.filter((_, mi) => slotOf(d.index, mi)?.carId).length;
          return (
            <Link
              key={d.index}
              href={mealsHref(d.index)}
              className="min-h-12 rounded-[3px] flex flex-col items-center justify-center gap-0.5"
              style={{
                background: active ? "var(--card)" : "transparent",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <span
                className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-[0.05em]"
                style={{ color: active ? "var(--text)" : "var(--muted)" }}
              >
                {d.label}
              </span>
              <span
                className="text-[0.625rem] tracking-[0.04em]"
                style={{ color: dayBooked < dayBookable ? "var(--warn-bg)" : "var(--accent)" }}
              >
                {dayBooked}/{dayBookable}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Créneaux du jour sélectionné */}
      {MEALS.map((meal, mi) => {
        const slot = slotOf(selectedDay, mi);
        const team = teamOf(slot?.carId ?? null);
        const mine = team?.isMine ?? false;
        const canEdit = !!team && (mine || isAdmin);
        const shop = slot?.shop ?? [];
        const done = shop.filter((x) => x.done).length;
        const edge = team ? (mine ? "var(--accent)" : "var(--accent-soft)") : "var(--warn-bg)";

        return (
          <div
            key={mi}
            id={`slot-${mi}`}
            className="card meal-slot scroll-mt-24 flex flex-col gap-3"
            style={{ borderLeft: `3px solid ${edge}` }}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="font-[family-name:var(--font-oswald)] text-[1.05rem] font-semibold uppercase tracking-[0.04em] leading-tight">
                  {meal.label}
                </div>
                <div className="text-[0.7rem] tracking-[0.05em] muted mt-0.5">
                  {days[selectedDay].label} · {meal.time}
                </div>
              </div>
              <span
                className="shrink-0 whitespace-nowrap text-[0.625rem] uppercase tracking-[0.1em] px-2 py-1 rounded-[3px]"
                style={
                  team
                    ? mine
                      ? { background: "var(--accent)", color: "var(--bg)" }
                      : { background: "var(--accent-soft)", color: "var(--accent)" }
                    : { background: "rgba(244,162,89,.18)", color: "#a05a20" }
                }
              >
                {team ? (mine ? "Mon équipe" : "Réservé") : "Libre"}
              </span>
            </div>

            {team && (
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 shrink-0 rounded-[3px] flex items-center justify-center text-[0.7rem] font-bold"
                  style={
                    mine
                      ? { background: "var(--accent)", color: "var(--bg)" }
                      : { background: "rgba(0,0,0,.06)", color: "var(--muted)" }
                  }
                >
                  {team.initials}
                </span>
                <div className="min-w-0">
                  <div className="text-[0.8rem] font-semibold">{team.label}</div>
                  <div className="text-[0.625rem] tracking-[0.04em] muted mt-0.5">
                    {team.car.label} · {team.members.length} personne
                    {team.members.length > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            )}

            {/* Menu */}
            {team && (
              <div className="flex flex-col gap-1.5">
                <span className="eyebrow">Menu</span>
                {canEdit ? (
                  <form action={updateMealMenu} className="flex flex-col gap-2">
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="day" value={selectedDay} />
                    <input type="hidden" name="meal" value={mi} />
                    <textarea
                      name="menu"
                      className="input serif min-h-16 !py-2.5 resize-none"
                      defaultValue={slot?.menu ?? ""}
                      placeholder="ex. Chili végé + guacamole, s'mores en dessert"
                    />
                    <SubmitButton className="btn-ghost !min-h-0 !py-1 self-start">
                      Enregistrer le menu
                    </SubmitButton>
                  </form>
                ) : (
                  <p className="serif !text-base whitespace-pre-wrap">
                    {slot?.menu || (
                      <span className="muted not-italic">Menu pas encore décidé</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Liste de courses — éditable par l'équipe */}
            {canEdit && (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="eyebrow">Liste de courses</span>
                  <span className="text-[0.7rem] muted whitespace-nowrap">
                    {done} / {shop.length}
                  </span>
                </div>
                <div className="flex flex-col">
                  {shop.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-2.5 min-h-9"
                      style={{ borderBottom: "1px solid var(--hair)" }}
                    >
                      <form action={toggleMealShopItem} className="flex-1 min-w-0">
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="itemId" value={it.id} />
                        <button
                          type="submit"
                          className="flex items-center gap-2.5 text-left w-full"
                        >
                          <span
                            aria-hidden
                            className="w-[18px] h-[18px] shrink-0 rounded-[3px] flex items-center justify-center text-[0.7rem]"
                            style={{
                              background: it.done ? "var(--accent)" : "transparent",
                              border: `1px solid ${it.done ? "var(--accent)" : "rgba(0,0,0,.22)"}`,
                              color: "var(--bg)",
                            }}
                          >
                            {it.done ? "✓" : ""}
                          </span>
                          <span
                            className="flex-1 text-[0.8rem]"
                            style={{
                              color: it.done ? "var(--muted)" : "var(--text)",
                              textDecoration: it.done ? "line-through" : "none",
                            }}
                          >
                            {it.text}
                          </span>
                        </button>
                      </form>
                      <form action={deleteMealShopItem}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="itemId" value={it.id} />
                        <button
                          type="submit"
                          aria-label={`Retirer ${it.text}`}
                          className="shrink-0 muted text-sm px-1"
                        >
                          ×
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
                <form action={addMealShopItem} className="flex gap-2">
                  <input type="hidden" name="tripId" value={tripId} />
                  <input type="hidden" name="day" value={selectedDay} />
                  <input type="hidden" name="meal" value={mi} />
                  <input
                    name="text"
                    className="input !py-1"
                    placeholder="Ajouter un article"
                    required
                  />
                  <button className="btn-ghost !min-h-0 !py-1 shrink-0">Ajouter</button>
                </form>
              </div>
            )}

            {/* Régimes du groupe (rappel pour l'équipe qui cuisine) */}
            {canEdit && groupDiets.length > 0 && (
              <div
                className="flex flex-col gap-1.5 pt-2.5"
                style={{ borderTop: "1px solid var(--hair)" }}
              >
                <span className="eyebrow">À table, tout le groupe</span>
                <div className="flex flex-wrap gap-1.5">
                  {groupDiets.map((p) => (
                    <span
                      key={p.id}
                      className="tag"
                      style={{
                        background: "rgba(140,179,105,.15)",
                        color: "#5a7a3a",
                        textTransform: "none",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {p.name} · {p.dietary}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions de réservation */}
            {myTeam && (
              <div
                className="flex flex-wrap gap-2 pt-2.5"
                style={{ borderTop: "1px solid var(--hair)" }}
              >
                {!team && (
                  <form action={bookMealSlot}>
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="day" value={selectedDay} />
                    <input type="hidden" name="meal" value={mi} />
                    <input type="hidden" name="carId" value={myTeam.car.id} />
                    <button className="btn !min-h-0 !py-1.5">Mon équipe s&apos;en charge</button>
                  </form>
                )}
                {mine && (
                  <form action={bookMealSlot}>
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="day" value={selectedDay} />
                    <input type="hidden" name="meal" value={mi} />
                    <input type="hidden" name="carId" value="" />
                    <button
                      className="btn-ghost !min-h-0 !py-1.5"
                      style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                    >
                      Libérer le créneau
                    </button>
                  </form>
                )}
                {team && !mine && (
                  <form action={bookMealSlot}>
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="day" value={selectedDay} />
                    <input type="hidden" name="meal" value={mi} />
                    <input type="hidden" name="carId" value={myTeam.car.id} />
                    <button className="btn-ghost !min-h-0 !py-1.5">
                      Reprendre pour mon équipe
                    </button>
                  </form>
                )}
              </div>
            )}

            {!myTeam && (
              <p
                className="text-[0.7rem] leading-relaxed muted pt-2.5"
                style={{ borderTop: "1px solid var(--hair)" }}
              >
                Rejoins une voiture dans l&apos;onglet Voitures pour intégrer une équipe et
                réserver un créneau.
              </p>
            )}
          </div>
        );
      })}

      {myTeam && (
        <div className="card-dashed flex flex-col gap-1.5">
          <span className="eyebrow">Mon équipe</span>
          <span className="text-[0.8rem] font-semibold">{myTeam.label}</span>
          <span className="text-[0.7rem] leading-relaxed muted">
            {(() => {
              const mineSlots = slots
                .filter((s) => s.carId === myTeam.car.id)
                .map((s) => `${days[s.day]?.short ?? "?"} ${MEALS[s.meal].short.toLowerCase()}`);
              return mineSlots.length
                ? `Vous prenez en charge : ${mineSlots.join(", ")}.`
                : "Votre équipe n'a encore réservé aucun créneau.";
            })()}
          </span>
          <span className="text-[0.625rem] leading-relaxed muted">
            N&apos;importe quel membre de l&apos;équipe peut réserver, libérer un créneau et
            modifier le menu.
          </span>
        </div>
      )}
    </div>
  );
}
