import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getParticipants, getPendingCount, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { adminActAs, logout, toggleTheme } from "@/lib/actions";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId: tripIdRaw } = await params;
  const tripId = Number(tripIdRaw);
  if (!Number.isInteger(tripId)) redirect("/");
  const identity = await requireTripIdentity(tripId);
  const trip = await getTripById(tripId);
  if (!trip) redirect("/");

  const store = await cookies();
  const theme = store.get("theme")?.value === "dark" ? "dark" : "light";
  const pending = await getPendingCount(tripId, identity.effective.id);
  const participants = identity.role === "admin" ? await getParticipants(tripId) : [];

  const nav = [
    { href: `/t/${tripId}`, label: "📣 Annonces" },
    { href: `/t/${tripId}/participants`, label: "👥 Groupe" },
    ...(trip.pageCarpool ? [{ href: `/t/${tripId}/carpool`, label: "🚗 Voitures" }] : []),
    ...(trip.pageMeals ? [{ href: `/t/${tripId}/meals`, label: "🍲 Repas" }] : []),
    ...(trip.pageTents ? [{ href: `/t/${tripId}/tents`, label: "⛺ Tentes" }] : []),
    ...(trip.pageGear ? [{ href: `/t/${tripId}/gear`, label: "🎒 Matos" }] : []),
    ...(identity.role === "admin"
      ? [{ href: `/t/${tripId}/admin`, label: "⚙️ Admin" }]
      : []),
  ];

  return (
    <div
      data-trip-theme={trip.theme}
      className="min-h-dvh flex flex-col"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <header className="sticky top-0 z-20 border-b px-4 py-2.5 backdrop-blur bg-[var(--card)]/90 border-[var(--border)]">
        <div className="mx-auto max-w-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="btn-ghost !px-2 shrink-0" title="Mes voyages">←</Link>
            <div className="min-w-0">
              <div className="font-bold leading-tight truncate">🏕️ {trip.name}</div>
              <div className="text-xs muted truncate">
                {identity.role === "admin"
                  ? identity.isImpersonating
                    ? `👑 ${identity.user.firstName} — agit pour ${identity.effective.name}`
                    : `👑 ${identity.user.firstName} (admin)`
                  : `Connecté : ${identity.effective.name}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <form action={toggleTheme}>
              <button className="btn-ghost !px-2" title="Clair/sombre">
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
            </form>
            <form action={logout}>
              <button className="btn-ghost !px-2" title="Se déconnecter">⎋</button>
            </form>
          </div>
        </div>
        {identity.role === "admin" && (
          <form action={adminActAs} className="mx-auto max-w-xl mt-2 flex items-center gap-2">
            <input type="hidden" name="tripId" value={tripId} />
            <select
              name="pid"
              className="input !py-1.5 text-sm"
              defaultValue={identity.isImpersonating ? identity.effective.id : 0}
            >
              <option value={0}>— Agir en mon nom —</option>
              {participants
                .filter((p) => p.id !== identity.participant.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Agir en tant que {p.name}
                  </option>
                ))}
            </select>
            <button className="btn-ghost shrink-0 !py-1.5">OK</button>
          </form>
        )}
        {identity.isImpersonating && (
          <div
            className="mx-auto max-w-xl mt-2 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: "var(--warn-bg)" }}
          >
            ⚠️ Mode impersonation : vos actions sont faites au nom de {identity.effective.name}
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-4 pb-36">{children}</main>

      {trip.requireReaction && pending > 0 && (
        <Link
          href={`/t/${tripId}`}
          className="fixed left-0 right-0 z-30 px-4 py-3 text-center font-semibold text-white"
          style={{ background: "var(--warn-bg)", bottom: "3.4rem" }}
        >
          🔔 {pending} annonce{pending > 1 ? "s" : ""} à valider — réagis avec un emoji !
        </Link>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-[var(--card)] border-[var(--border)]">
        <div
          className="mx-auto max-w-xl grid text-center"
          style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-2.5 text-[0.7rem] font-semibold leading-tight"
            >
              <span className="block text-base">{item.label.split(" ")[0]}</span>
              {item.label.split(" ")[1]}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
