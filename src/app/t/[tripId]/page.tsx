import Link from "next/link";
import {
  getAnnouncements,
  getGearClaims,
  getGearItems,
  getParticipants,
  getReactions,
  getTripById,
} from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { AnnouncementComposer } from "@/components/AnnouncementComposer";
import { RichText } from "@/components/RichText";
import {
  deleteAnnouncement,
  publishAnnouncement,
  reactToAnnouncement,
  updateAnnouncement,
} from "@/lib/actions";

const EMOJIS = ["👍", "❤️", "🎉", "😂", "😮"];

function initials(name: string): string {
  return (name.trim().split(/\s+/)[0] || "?").slice(0, 2).toUpperCase();
}

// « 21 – 23 juin » quand même mois, sinon plage complète. null si pas de date.
function formatRange(start: string, end: string): string | null {
  if (!start) return null;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  const s = new Date(start + "T12:00:00");
  if (!end) return s.toLocaleDateString("fr-FR", opts);
  const e = new Date(end + "T12:00:00");
  const sameMonth =
    s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  return sameMonth
    ? `${s.getDate()} – ${e.toLocaleDateString("fr-FR", opts)}`
    : `${s.toLocaleDateString("fr-FR", opts)} – ${e.toLocaleDateString("fr-FR", opts)}`;
}

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  const trip = (await getTripById(tripId))!;
  const announcements = await getAnnouncements(tripId);
  const reactions = await getReactions(tripId);
  const participants = await getParticipants(tripId);
  const gearItems = await getGearItems(tripId);
  const gearClaims = await getGearClaims(tripId);
  const total = participants.length;

  // ---- « Le voyage d'un coup d'œil » : chiffres-clés + prochaine action ----
  const me = participants.find((p) => p.id === identity.effective.id);
  const confirmed = participants.filter((p) => p.isConfirmed).length;
  const noCar = participants.filter((p) => !p.carId).length;
  const noTent = participants.filter((p) => !p.tentId).length;

  const claimedByItem = new Map<number, number>();
  for (const c of gearClaims) {
    claimedByItem.set(c.itemId, (claimedByItem.get(c.itemId) ?? 0) + c.qty);
  }
  const gearMissing = gearItems.filter(
    (i) => (claimedByItem.get(i.id) ?? 0) < i.qtyRequired
  ).length;

  const pendingForMe = trip.requireReaction
    ? announcements.filter(
        (a) =>
          !reactions.some(
            (r) => r.announcementId === a.id && r.participantId === identity.effective.id
          )
      ).length
    : 0;

  const datesLabel = formatRange(trip.startDate, trip.endDate) ?? trip.name;
  const tiles = [
    {
      label: "Confirmés",
      value: `${confirmed}/${total}`,
      color: confirmed === total && total > 0 ? "var(--accent)" : "var(--text)",
    },
    {
      label: "Sans voiture",
      value: String(noCar),
      color: noCar > 0 ? "var(--warn-bg)" : "var(--accent)",
    },
    {
      label: "Sans tente",
      value: String(noTent),
      color: noTent > 0 ? "var(--warn-bg)" : "var(--accent)",
    },
    {
      label: "Matos incomplet",
      value: String(gearMissing),
      color: gearMissing > 0 ? "var(--warn-bg)" : "var(--accent)",
    },
  ];

  // Prochaine action prioritaire de l'utilisateur courant (respecte les pages actives).
  let todo: { line: string; href: string } | null = null;
  if (pendingForMe > 0) {
    todo = {
      line: `À faire : réagir à ${pendingForMe} annonce${pendingForMe > 1 ? "s" : ""}`,
      href: `/t/${tripId}#annonces`,
    };
  } else if (me && !me.carId && trip.pageCarpool) {
    todo = { line: "À faire : choisir ta place en voiture", href: `/t/${tripId}/carpool` };
  } else if (me && !me.tentId && trip.pageTents) {
    todo = { line: "À faire : choisir ta tente", href: `/t/${tripId}/tents` };
  } else if (gearMissing > 0 && trip.pageGear) {
    todo = {
      line: `À faire : ${gearMissing} item de matos incomplet${gearMissing > 1 ? "s" : ""}`,
      href: `/t/${tripId}/gear`,
    };
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Le voyage d'un coup d'œil */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-4 pt-3.5 pb-3 flex flex-col gap-1">
          <span className="eyebrow">Le voyage d&apos;un coup d&apos;œil</span>
          <span className="font-[family-name:var(--font-oswald)] text-[1.6rem] font-bold uppercase tracking-[0.04em] leading-[1.05] mt-1">
            {datesLabel}
          </span>
          {trip.location && (
            <span className="serif !text-base leading-[1.4]">{trip.location}</span>
          )}
          {trip.meetingPoint && (
            <span className="muted text-[0.7rem] tracking-[0.05em] mt-1.5">
              Départ · {trip.meetingPoint}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2" style={{ borderTop: "1px solid var(--hair)" }}>
          {tiles.map((t) => (
            <div
              key={t.label}
              className="px-3.5 py-2.5 flex flex-col gap-0.5"
              style={{
                borderRight: "1px solid var(--hair)",
                borderBottom: "1px solid var(--hair)",
              }}
            >
              <span className="text-[1.05rem] font-bold" style={{ color: t.color }}>
                {t.value}
              </span>
              <span className="muted text-[0.625rem] uppercase tracking-[0.1em]">
                {t.label}
              </span>
            </div>
          ))}
        </div>
        {todo && (
          <Link
            href={todo.href}
            className="flex items-center justify-between gap-2.5 px-4 py-2.5 text-[0.75rem] tracking-[0.04em]"
            style={{ background: "#f4e285", color: "#2b2b2b", borderTop: "1px solid var(--hair)" }}
          >
            <span>{todo.line}</span>
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>

      {identity.role === "admin" && (
        <AnnouncementComposer
          tripId={tripId}
          action={publishAnnouncement}
          eyebrow={
            identity.isImpersonating
              ? `Nouvelle annonce · publiée pour ${identity.effective.name}`
              : "Nouvelle annonce"
          }
        />
      )}

      <div id="annonces" className="flex items-center justify-between scroll-mt-24">
        <span className="eyebrow">Annonces ({announcements.length})</span>
      </div>

      {announcements.map((a) => {
        const aReactions = reactions.filter((r) => r.announcementId === a.id);
        const reactedIds = new Set(aReactions.map((r) => r.participantId));
        const emojiByPid = new Map(aReactions.map((r) => [r.participantId, r.emoji]));
        const missing = participants.filter((p) => !reactedIds.has(p.id));
        const myReaction = aReactions.find(
          (r) => r.participantId === identity.effective.id
        );
        const seen = reactedIds.size;
        const allSeen = seen >= total && total > 0;
        const pct = total > 0 ? Math.round((seen / total) * 100) : 0;
        const seenColor = allSeen
          ? "var(--accent)"
          : myReaction
            ? "var(--text)"
            : "var(--warn-bg)";

        return (
          <div
            key={a.id}
            className="card flex flex-col gap-3"
            style={{
              borderLeft: `3px solid ${myReaction ? "var(--hair)" : "var(--warn-bg)"}`,
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="text-[0.7rem] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--accent)" }}
              >
                {a.authorLabel}
              </span>
              <span className="muted text-[0.7rem]">
                {new Date(a.createdAt).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <RichText content={a.content} font={a.font} />

            {identity.role === "admin" && (
              <details className="text-xs">
                <summary className="muted cursor-pointer select-none">
                  Modifier / supprimer
                </summary>
                <div className="flex flex-col gap-2 mt-2">
                  <AnnouncementComposer
                    tripId={tripId}
                    action={updateAnnouncement}
                    announcementId={a.id}
                    defaultContent={a.content}
                    defaultFont={a.font}
                    submitLabel="Enregistrer"
                    note="Sélectionne du texte puis Gras / Italique, puis Enregistrer."
                  />
                  <form action={deleteAnnouncement} className="self-end">
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="announcementId" value={a.id} />
                    <button
                      className="btn-ghost"
                      style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                    >
                      Supprimer l&apos;annonce
                    </button>
                  </form>
                </div>
              </details>
            )}

            <div className="flex gap-1.5 flex-wrap">
              {EMOJIS.map((e) => (
                <form key={e} action={reactToAnnouncement}>
                  <input type="hidden" name="tripId" value={tripId} />
                  <input type="hidden" name="announcementId" value={a.id} />
                  <input type="hidden" name="emoji" value={e} />
                  <button
                    className="flex items-center justify-center text-lg"
                    style={{
                      width: 44,
                      height: 38,
                      borderRadius: 3,
                      border: `1px solid ${
                        myReaction?.emoji === e ? "var(--accent)" : "rgba(0,0,0,.14)"
                      }`,
                      background:
                        myReaction?.emoji === e ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    {e}
                  </button>
                </form>
              ))}
            </div>

            <div
              className="pt-3 flex flex-col gap-2.5"
              style={{ borderTop: "1px solid var(--hair)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[0.7rem] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: seenColor }}
                >
                  {allSeen
                    ? "Tout le monde a vu"
                    : myReaction
                      ? "Vu par le groupe"
                      : "Tu n'as pas réagi"}
                </span>
                <span className="muted text-[0.7rem]">
                  {seen} / {total}
                </span>
              </div>
              <div style={{ height: 3, background: "var(--hair)", borderRadius: 3 }}>
                <div
                  style={{
                    height: 3,
                    width: `${pct}%`,
                    background: seenColor,
                    borderRadius: 3,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {participants.map((p) => {
                  const em = emojiByPid.get(p.id);
                  return (
                    <span
                      key={p.id}
                      title={
                        em ? `${p.name} a réagi ${em}` : `${p.name} n'a pas encore réagi`
                      }
                      className="flex items-center justify-center text-xs"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 3,
                        background: em ? "var(--accent-soft)" : "transparent",
                        border: `1px ${em ? "solid" : "dashed"} ${
                          em ? "var(--accent)" : "rgba(0,0,0,.22)"
                        }`,
                        color: em ? "var(--text)" : "var(--muted)",
                      }}
                    >
                      {em || initials(p.name)}
                    </span>
                  );
                })}
              </div>
              {identity.role === "admin" && missing.length > 0 && (
                <span
                  className="self-start text-[0.65rem] font-semibold uppercase tracking-[0.08em] px-3 py-1.5"
                  style={{
                    borderRadius: 3,
                    border: "1px solid var(--warn-bg)",
                    color: "#a05a20",
                    background: "rgba(244,162,89,.15)",
                  }}
                >
                  {missing.length} absent{missing.length > 1 ? "s" : ""} :{" "}
                  {missing.map((p) => p.name).join(", ")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
