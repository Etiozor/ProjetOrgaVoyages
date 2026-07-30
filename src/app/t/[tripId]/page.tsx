import { getAnnouncements, getParticipants, getReactions } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { SubmitButton } from "@/components/SubmitButton";
import {
  deleteAnnouncement,
  publishAnnouncement,
  reactToAnnouncement,
  updateAnnouncement,
} from "@/lib/actions";

const EMOJIS = ["👍", "❤️", "🎉", "😂", "😮"];

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  const announcements = await getAnnouncements(tripId);
  const reactions = await getReactions(tripId);
  const participants = await getParticipants(tripId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">📣 Annonces</h1>

      {identity.role === "admin" && (
        <form action={publishAnnouncement} className="card flex flex-col gap-2">
          <input type="hidden" name="tripId" value={tripId} />
          <label className="font-semibold text-sm">
            Nouvelle annonce{" "}
            {identity.isImpersonating && `(publiée pour ${identity.effective.name})`}
          </label>
          <textarea
            name="content"
            className="input min-h-20"
            placeholder="Écris ton annonce…"
            required
          />
          <button className="btn self-end">Publier</button>
          <p className="muted text-xs">
            📧 Un email est envoyé aux participants ayant fourni leur adresse.
          </p>
        </form>
      )}

      {announcements.map((a) => {
        const aReactions = reactions.filter((r) => r.announcementId === a.id);
        const reactedIds = new Set(aReactions.map((r) => r.participantId));
        const missing = participants.filter((p) => !reactedIds.has(p.id));
        const myReaction = aReactions.find(
          (r) => r.participantId === identity.effective.id
        );

        return (
          <div key={a.id} className="card flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-sm" style={{ color: "var(--accent)" }}>
                {a.authorLabel}
              </span>
              <span className="muted text-xs">
                {new Date(a.createdAt).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{a.content}</p>

            {identity.role === "admin" && (
              <details className="text-xs">
                <summary className="muted cursor-pointer select-none">
                  ✏️ Modifier / supprimer
                </summary>
                <div className="flex flex-col gap-2 mt-2">
                  <form action={updateAnnouncement} className="flex flex-col gap-2">
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="announcementId" value={a.id} />
                    <textarea
                      name="content"
                      className="input min-h-16"
                      defaultValue={a.content}
                      required
                    />
                    <SubmitButton className="btn-ghost !py-1 self-end">Enregistrer</SubmitButton>
                  </form>
                  <form action={deleteAnnouncement} className="self-end">
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="announcementId" value={a.id} />
                    <button
                      className="btn-ghost !py-1"
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
                    className="rounded-full border px-2.5 py-1 text-lg"
                    style={{
                      borderColor:
                        myReaction?.emoji === e ? "var(--accent)" : "var(--border)",
                      background:
                        myReaction?.emoji === e ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    {e}
                  </button>
                </form>
              ))}
            </div>

            <div className="text-sm border-t pt-2 border-[var(--border)]">
              <div className="flex flex-wrap gap-1.5">
                {aReactions.map((r) => {
                  const p = participants.find((x) => x.id === r.participantId);
                  return (
                    <span key={r.participantId} className="tag">
                      {r.emoji} {p?.name ?? "?"}
                    </span>
                  );
                })}
                {aReactions.length === 0 && (
                  <span className="muted text-xs">Aucune réaction pour l&apos;instant</span>
                )}
              </div>
              {missing.length > 0 && (
                <p className="muted text-xs mt-1.5">
                  ⏳ N&apos;ont pas encore réagi : {missing.map((p) => p.name).join(", ")}
                </p>
              )}
              {missing.length === 0 && aReactions.length > 0 && (
                <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--accent)" }}>
                  ✅ Tout le monde a vu cette annonce
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
