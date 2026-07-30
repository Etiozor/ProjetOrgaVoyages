import { redirect } from "next/navigation";
import {
  getGearCategories,
  getGearClaims,
  getGearItems,
  getParticipants,
  getTripById,
} from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { addGearCategory, addGearItem, setGearClaim } from "@/lib/actions";

export default async function GearPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const tripId = Number((await params).tripId);
  const identity = await requireTripIdentity(tripId);
  if (!(await getTripById(tripId))!.pageGear) redirect(`/t/${tripId}`);
  const categories = await getGearCategories(tripId);
  const items = await getGearItems(tripId);
  const claims = await getGearClaims(tripId);
  const participants = await getParticipants(tripId);
  const me = identity.effective;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">🎒 Matos</h1>
      <p className="muted text-sm">
        Indique combien d&apos;unités tu prends de chaque item — l&apos;objectif est
        d&apos;atteindre la quantité requise, à plusieurs si besoin.
      </p>

      <form action={addGearItem} className="card flex flex-col gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <p className="font-semibold text-sm">Ajouter un item</p>
        <input name="name" className="input" placeholder="ex. Lampe frontale, réchaud…" required />
        <div className="flex gap-2">
          <select name="categoryId" className="input">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="qtyRequired"
            type="number"
            min={1}
            defaultValue={1}
            className="input !w-24"
            title="Quantité requise"
          />
          <button className="btn shrink-0">Ajouter</button>
        </div>
      </form>

      <form action={addGearCategory} className="flex gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <input name="name" className="input" placeholder="Nouvelle catégorie (ex. Pêche)" required />
        <button className="btn-ghost shrink-0">+ Catégorie</button>
      </form>

      {items.length === 0 && (
        <p className="muted">La liste est vide — ajoutez ce qu&apos;il faut apporter !</p>
      )}

      {categories.map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        if (catItems.length === 0) return null;
        return (
          <div key={cat.id} className="flex flex-col gap-2">
            <h2 className="font-bold text-sm uppercase tracking-wide muted">{cat.name}</h2>
            {catItems.map((item) => {
              const itemClaims = claims.filter((c) => c.itemId === item.id);
              const taken = itemClaims.reduce((sum, c) => sum + c.qty, 0);
              const done = taken >= item.qtyRequired;
              const myClaim = itemClaims.find((c) => c.participantId === me.id);
              return (
                <div key={item.id} className="card !py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {done ? "✅" : "⬜"} {item.name}
                    </span>
                    <span
                      className="tag"
                      style={
                        done
                          ? undefined
                          : { background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }
                      }
                    >
                      {taken}/{item.qtyRequired} prise{item.qtyRequired > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {itemClaims.length === 0 && (
                      <span className="muted">Personne n&apos;en prend encore</span>
                    )}
                    {itemClaims.map((c) => {
                      const p = participants.find((x) => x.id === c.participantId);
                      return (
                        <span key={c.participantId} className="tag">
                          {p?.name ?? "?"}{c.qty > 1 ? ` ×${c.qty}` : ""}
                        </span>
                      );
                    })}
                  </div>
                  <form action={setGearClaim} className="flex items-center gap-2">
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <label className="text-xs muted shrink-0">J&apos;en prends :</label>
                    <input
                      name="qty"
                      type="number"
                      min={0}
                      max={99}
                      defaultValue={myClaim?.qty ?? 0}
                      className="input !w-20 !py-1 text-sm"
                    />
                    <button className="btn-ghost !py-1 text-xs shrink-0">OK</button>
                  </form>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
