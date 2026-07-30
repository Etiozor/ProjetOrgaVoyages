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
    <div className="mx-auto max-w-xl px-5 py-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.9rem]">Mes voyages</h1>
          <p className="muted text-sm mt-1.5 tracking-[0.04em]">Salut {user.firstName}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <form action={toggleTheme}>
            <button className="btn-ghost !min-h-0 !px-2 !py-1.5" title="Changer de thème">
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </form>
          <form action={logout}>
            <button
              className="btn-ghost !min-h-0 !px-3 !py-1.5 uppercase !text-[0.65rem] tracking-[0.1em]"
              style={{ color: "var(--muted)", borderColor: "var(--border)" }}
              title="Se déconnecter"
            >
              Quitter
            </button>
          </form>
        </div>
      </div>

      {trips.length === 0 && (
        <div className="card text-center py-8 flex flex-col gap-1.5">
          <p className="font-[family-name:var(--font-oswald)] text-lg uppercase">
            Aucun voyage pour l&apos;instant
          </p>
          <p className="muted text-sm">
            Rejoins un voyage avec son code, ou crées-en un nouveau.
          </p>
        </div>
      )}

      {trips.map((trip) => {
        const count = trip.participantCount;
        const dates = formatDates(trip.startDate, trip.endDate);
        const fill = Math.min(100, Math.round((count / Math.max(1, trip.capacity)) * 100));
        return (
          <Link
            key={trip.id}
            href={`/t/${trip.id}`}
            className="card !p-0 overflow-hidden block"
          >
            <div className="p-4 flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="font-[family-name:var(--font-oswald)] text-[1.2rem] font-semibold uppercase tracking-[0.03em] leading-tight">
                  {trip.name}
                </span>
                <span
                  className="tag shrink-0"
                  style={
                    trip.role === "admin"
                      ? undefined
                      : { background: "rgba(0,0,0,.06)", color: "var(--muted)" }
                  }
                >
                  {trip.role === "admin" ? "Admin" : "Participant"}
                </span>
              </div>
              {(trip.location || dates) && (
                <p className="serif !text-base truncate">
                  {[trip.location, dates].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="muted text-[0.7rem] tracking-[0.05em] mt-1.5">
                {count} participant{count > 1 ? "s" : ""} · {trip.capacity} attendus
              </p>
            </div>
            <div style={{ height: 4, background: "rgba(0,0,0,.06)" }}>
              <div style={{ height: 4, width: `${fill}%`, background: "var(--accent)" }} />
            </div>
          </Link>
        );
      })}

      <form action={submitTripCode} className="card-dashed flex flex-col gap-2.5">
        <p className="eyebrow">Ajouter un voyage</p>
        <div className="flex gap-2">
          <input
            name="code"
            className="input uppercase tracking-[0.14em]"
            placeholder="CODE DU VOYAGE"
            required
          />
          <button className="btn shrink-0">Rejoindre</button>
        </div>
        {params.error === "code" && (
          <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
            Aucun voyage avec ce code, vérifie auprès de l&apos;admin.
          </p>
        )}
        <p className="muted text-xs">Essaie CAMP2026</p>
      </form>

      <Link href="/new" className="btn-ghost justify-center">
        Créer un nouveau voyage
      </Link>
    </div>
  );
}
