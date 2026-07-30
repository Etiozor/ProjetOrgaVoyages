import Link from "next/link";
import { cookies } from "next/headers";
import { getUserTrips } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logout, submitTripCode, toggleTheme } from "@/lib/actions";

function formatDates(start: string, end: string): string | null {
  if (!start) return null;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const s = new Date(start + "T12:00:00").toLocaleDateString("fr-FR", opts);
  if (!end) return s;
  const e = new Date(end + "T12:00:00").toLocaleDateString("fr-FR", opts);
  return `${s} – ${e}`;
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const trips = await getUserTrips(user.id);
  const store = await cookies();
  const theme = store.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <div className="mx-auto max-w-xl px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">🏕️ Mes voyages</h1>
          <p className="muted text-sm">Salut {user.firstName} !</p>
        </div>
        <div className="flex items-center gap-1.5">
          <form action={toggleTheme}>
            <button className="btn-ghost !px-2" title="Changer de thème">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </form>
          <form action={logout}>
            <button className="btn-ghost !px-2" title="Se déconnecter">⎋</button>
          </form>
        </div>
      </div>

      {trips.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-3xl mb-2">⛺</p>
          <p className="font-semibold">Aucun voyage pour l&apos;instant</p>
          <p className="muted text-sm mt-1">
            Rejoins un voyage avec son code, ou crées-en un nouveau.
          </p>
        </div>
      )}

      {trips.map((trip) => {
        const count = trip.participantCount;
        const dates = formatDates(trip.startDate, trip.endDate);
        return (
          <Link key={trip.id} href={`/t/${trip.id}`} className="card flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold truncate">🏕️ {trip.name}</span>
              {trip.role === "admin" && <span className="tag shrink-0">👑 Admin</span>}
            </div>
            <p className="muted text-sm truncate">
              {[trip.location, dates].filter(Boolean).join(" · ") || "—"}
            </p>
            <p className="muted text-xs">
              {count} participant{count > 1 ? "s" : ""} · {trip.capacity} attendus
            </p>
          </Link>
        );
      })}

      <form action={submitTripCode} className="card flex flex-col gap-2">
        <p className="font-semibold text-sm">➕ Ajouter un voyage</p>
        <div className="flex gap-2">
          <input
            name="code"
            className="input uppercase"
            placeholder="Code du voyage"
            required
          />
          <button className="btn shrink-0">Rejoindre</button>
        </div>
        {params.error === "code" && (
          <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
            Aucun voyage avec ce code, vérifie auprès de l&apos;admin.
          </p>
        )}
      </form>

      <Link href="/new" className="btn-ghost justify-center">
        ✨ Créer un nouveau voyage
      </Link>
    </div>
  );
}
