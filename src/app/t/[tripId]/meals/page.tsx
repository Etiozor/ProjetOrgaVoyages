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
import { type MealCell } from "@/components/MealPlanningGrid";
import { MealPlanningBoard, type DayTile } from "@/components/MealPlanningBoard";
import {
  addMealShopItem,
  bookMealSlot,
  deleteMealShopItem,
  setMealSlotDisabled,
  toggleMealShopItem,
  updateMealMenu,
} from "@/lib/actions";

// Initiales courtes d'un prénom (2 lettres) — même logique que la page Participants.
function initials(name: string): string {
  return (name.trim().split(/\s+/)[0] || "?").slice(0, 2).toUpperCase();
}

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

  // Couverture globale du week-end : les créneaux « N/A » (désactivés par l'admin)
  // ne comptent ni dans le total ni dans les compteurs.
  const disabledCount = slots.filter((s) => s.disabled).length;
  const totalSlots = days.length * MEALS.length - disabledCount;
  const bookedSlots = slots.filter((s) => s.carId).length;
  const coverAll = totalSlots > 0 && bookedSlots >= totalSlots;

  // Cases de la grille d'ensemble (service × jour), aplaties pour le composant client.
  const gridCells: MealCell[] = [];
  for (let mi = 0; mi < MEALS.length; mi++) {
    for (const d of days) {
      const slot = slotOf(d.index, mi);
      if (slot?.disabled) {
        gridCells.push({
          dayIndex: d.index,
          mealIndex: mi,
          kind: "disabled",
          label: "N/A",
          title: `${d.label} · ${MEALS[mi].label} — non prévu`,
        });
        continue;
      }
      const cellTeam = teamOf(slot?.carId ?? null);
      gridCells.push({
        dayIndex: d.index,
        mealIndex: mi,
        kind: cellTeam ? (cellTeam.isMine ? "mine" : "other") : "free",
        label: cellTeam ? cellTeam.initials : "libre",
        title: `${d.label} · ${MEALS[mi].label} — ${cellTeam ? cellTeam.label : "personne"}`,
      });
    }
  }

  // Tuiles de sélection de jour, avec le compteur de créneaux pourvus par jour.
  const dayTiles: DayTile[] = days.map((d) => ({
    index: d.index,
    label: d.label,
    bookable: MEALS.filter((_, mi) => !slotOf(d.index, mi)?.disabled).length,
    booked: MEALS.filter((_, mi) => slotOf(d.index, mi)?.carId).length,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">Repas</h1>
        <p className="serif !text-base mt-1.5">
          Trois créneaux par jour. Une équipe — les occupants d&apos;une voiture — prend
          en charge un créneau et cuisine pour tout le groupe.
        </p>
      </div>

      {/* Vue d'ensemble (grille services × jours) + sélecteur de jour :
          un même filtre de pagination limite l'affichage des deux. */}
      <MealPlanningBoard
        tripId={tripId}
        days={days.map((d) => ({ index: d.index, short: d.short }))}
        meals={MEALS.map((m) => m.short)}
        cells={gridCells}
        tiles={dayTiles}
        selectedDay={selectedDay}
        bookedSlots={bookedSlots}
        totalSlots={totalSlots}
        coverAll={coverAll}
      />

      {/* Créneaux du jour sélectionné */}
      {MEALS.map((meal, mi) => {
        const slot = slotOf(selectedDay, mi);
        const disabled = slot?.disabled ?? false;
        const team = disabled ? null : teamOf(slot?.carId ?? null);
        const mine = team?.isMine ?? false;
        const canEdit = !!team && (mine || isAdmin);
        const shop = slot?.shop ?? [];
        const done = shop.filter((x) => x.done).length;
        const edge = disabled
          ? "var(--border)"
          : team
            ? mine
              ? "var(--accent)"
              : "var(--accent-soft)"
            : "var(--warn-bg)";

        return (
          <div
            key={mi}
            id={`slot-${mi}`}
            className="card meal-slot scroll-mt-24 flex flex-col gap-3"
            style={{ borderLeft: `6px solid ${edge}` }}
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
                className="shrink-0 whitespace-nowrap uppercase"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.09em",
                  padding: "4px 8px",
                  borderRadius: 8,
                  ...(disabled
                    ? {
                        background: "transparent",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                      }
                    : team
                      ? mine
                        ? {
                            background: "var(--accent)",
                            color: "var(--bg)",
                            border: "1px solid var(--accent)",
                          }
                        : {
                            background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                            color: "var(--accent-text)",
                            border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
                          }
                      : {
                          background: "color-mix(in srgb, var(--warn-bg) 18%, transparent)",
                          color: "#8a4a18",
                          border: "1px solid color-mix(in srgb, var(--warn-bg) 45%, transparent)",
                        }),
                }}
              >
                {disabled ? "N/A" : team ? (mine ? "Mon équipe" : "Réservé") : "Libre"}
              </span>
            </div>

            {/* Créneau désactivé par l'admin : aucun repas prévu */}
            {disabled && (
              <>
                <p className="serif !text-base muted">
                  Créneau marqué « N/A » — aucun repas prévu par le groupe pour ce service.
                </p>
                {isAdmin && (
                  <form
                    action={setMealSlotDisabled}
                    className="pt-2.5"
                    style={{ borderTop: "1px solid var(--hair)" }}
                  >
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="day" value={selectedDay} />
                    <input type="hidden" name="meal" value={mi} />
                    <input type="hidden" name="disabled" value="0" />
                    <SubmitButton className="btn-ghost !min-h-0 !py-1.5 self-start">
                      Réactiver ce créneau
                    </SubmitButton>
                  </form>
                )}
              </>
            )}

            {team && (
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 shrink-0 rounded-[8px] flex items-center justify-center text-[0.7rem] font-bold"
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
                            className="w-[18px] h-[18px] shrink-0 rounded-[8px] flex items-center justify-center text-[0.7rem]"
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
            {!disabled && myTeam && (
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

            {!disabled && !myTeam && (
              <p
                className="text-[0.7rem] leading-relaxed muted pt-2.5"
                style={{ borderTop: "1px solid var(--hair)" }}
              >
                Rejoins une voiture dans l&apos;onglet Voitures pour intégrer une équipe et
                réserver un créneau.
              </p>
            )}

            {/* Admin : marquer le créneau « N/A » (aucun repas prévu) */}
            {!disabled && isAdmin && (
              <form
                action={setMealSlotDisabled}
                className="pt-2.5"
                style={{ borderTop: "1px solid var(--hair)" }}
              >
                <input type="hidden" name="tripId" value={tripId} />
                <input type="hidden" name="day" value={selectedDay} />
                <input type="hidden" name="meal" value={mi} />
                <input type="hidden" name="disabled" value="1" />
                <SubmitButton
                  className="btn-ghost !min-h-0 !py-1 self-start"
                  style={{ color: "var(--muted)" }}
                >
                  Marquer « N/A » — pas de repas
                </SubmitButton>
              </form>
            )}
          </div>
        );
      })}

      {myTeam && (
        <div className="card-dashed flex flex-col gap-1.5">
          <span className="eyebrow">Mon équipe</span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {myTeam.members.map((m) => {
                const isMe = m.id === me.id;
                return (
                  <span
                    key={m.id}
                    aria-hidden
                    title={m.name}
                    className="w-6 h-6 shrink-0 rounded-[8px] flex items-center justify-center text-[0.6rem] font-bold"
                    style={
                      isMe
                        ? { background: "var(--accent)", color: "var(--bg)" }
                        : { background: "rgba(0,0,0,.06)", color: "var(--muted)" }
                    }
                  >
                    {initials(m.name)}
                  </span>
                );
              })}
            </div>
            <span className="text-[0.75rem] muted">
              {myTeam.members
                .map((m) => (m.id === me.id ? "toi" : m.name.split(/\s+/)[0]))
                .join(", ")}
            </span>
          </div>
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
