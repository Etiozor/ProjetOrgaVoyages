import { redirect } from "next/navigation";
import {
  getGearCategories,
  getGearClaims,
  getGearItems,
  getParticipants,
  getTripById,
} from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { SubmitButton } from "@/components/SubmitButton";
import {
  addGearCategory,
  addGearItem,
  deleteGearCategory,
  deleteGearItem,
  setGearClaim,
  updateGearCategory,
  updateGearItem,
} from "@/lib/actions";

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
  const isAdmin = identity.role === "admin";

  // Total pris par item (toutes les contributions cumulées) → « fait » si ≥ requis.
  const takenByItem = new Map<number, number>();
  for (const c of claims) {
    takenByItem.set(c.itemId, (takenByItem.get(c.itemId) ?? 0) + c.qty);
  }
  const isDone = (i: (typeof items)[number]) =>
    (takenByItem.get(i.id) ?? 0) >= i.qtyRequired;
  const gearOk = items.filter(isDone).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-baseline justify-between gap-2.5">
          <h1 className="text-2xl">Matos</h1>
          <span className="text-[0.7rem] muted whitespace-nowrap shrink-0">
            {gearOk}/{items.length} complets
          </span>
        </div>
        <p className="serif !text-base mt-1.5">
          Indique combien d&apos;unités tu prends — l&apos;objectif est d&apos;atteindre
          la quantité requise, à plusieurs si besoin.
        </p>
      </div>

      {items.length === 0 && (
        <p className="muted">La liste est vide — ajoutez ce qu&apos;il faut apporter !</p>
      )}

      {categories.map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        // Catégories vides : masquées aux participants, visibles à l'admin pour gestion
        if (catItems.length === 0 && !isAdmin) return null;
        const catOk = catItems.filter(isDone).length;
        return (
          <div key={cat.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="eyebrow whitespace-nowrap">{cat.name}</h2>
              <span className="flex-1 h-px" style={{ background: "var(--hair)" }} />
              <span className="text-[0.7rem] muted whitespace-nowrap shrink-0">
                {catOk}/{catItems.length}
              </span>
              {isAdmin && (
                <details className="text-xs">
                  <summary className="muted cursor-pointer select-none">✏️</summary>
                  <div className="flex flex-col items-end gap-2 mt-2">
                    <form action={updateGearCategory} className="flex gap-2">
                      <input type="hidden" name="tripId" value={tripId} />
                      <input type="hidden" name="categoryId" value={cat.id} />
                      <input
                        name="name"
                        className="input !py-1"
                        defaultValue={cat.name}
                        required
                      />
                      <button className="btn-ghost !min-h-0 !py-1 shrink-0">Renommer</button>
                    </form>
                    {catItems.length === 0 ? (
                      <form action={deleteGearCategory}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="categoryId" value={cat.id} />
                        <button
                          className="btn-ghost !min-h-0 !py-1"
                          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                        >
                          Supprimer la catégorie
                        </button>
                      </form>
                    ) : (
                      <span className="muted">Videz la catégorie pour la supprimer.</span>
                    )}
                  </div>
                </details>
              )}
            </div>
            {catItems.map((item) => {
              const itemClaims = claims.filter((c) => c.itemId === item.id);
              const taken = itemClaims.reduce((sum, c) => sum + c.qty, 0);
              const done = taken >= item.qtyRequired;
              const myQty = itemClaims.find((c) => c.participantId === me.id)?.qty ?? 0;
              return (
                <div key={item.id} className="card !py-3 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="flex items-center justify-center shrink-0 text-[0.7rem]"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        background: done ? "var(--accent)" : "transparent",
                        border: `1px solid ${done ? "var(--accent)" : "rgba(0,0,0,.22)"}`,
                        color: "var(--bg)",
                      }}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span className="flex-1 font-semibold text-[0.95rem]">{item.name}</span>
                    <span
                      className="shrink-0 whitespace-nowrap rounded-[3px] px-[7px] py-[3px] text-[0.7rem] tracking-[0.06em] font-medium"
                      style={
                        done
                          ? { background: "var(--accent-soft)", color: "var(--accent)" }
                          : { background: "rgba(244,162,89,.15)", color: "#a05a20" }
                      }
                    >
                      {taken}/{item.qtyRequired}
                    </span>
                  </div>
                  <div style={{ height: 3, background: "var(--hair)", borderRadius: 3 }}>
                    <div
                      style={{
                        height: 3,
                        width: `${Math.min(100, Math.round((taken / item.qtyRequired) * 100))}%`,
                        background: done ? "var(--accent)" : "var(--warn-bg)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Qui apporte quoi — une puce par contributeur */}
                    <div className="flex flex-1 min-w-0 flex-wrap gap-[5px]">
                      {itemClaims.length === 0 ? (
                        <span
                          className="rounded-[3px] px-[7px] py-[3px] text-[0.7rem]"
                          style={{
                            color: "var(--muted)",
                            border: "1px solid var(--hair)",
                          }}
                        >
                          personne pour l&apos;instant
                        </span>
                      ) : (
                        itemClaims.map((c) => {
                          const p = participants.find((x) => x.id === c.participantId);
                          return (
                            <span
                              key={c.participantId}
                              className="whitespace-nowrap rounded-[3px] px-[7px] py-[3px] text-[0.7rem]"
                              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                            >
                              {p?.name ?? "?"}
                              {c.qty > 1 ? ` ×${c.qty}` : ""}
                            </span>
                          );
                        })
                      )}
                    </div>
                    {/* Stepper : ajuste MA contribution (± 1), instantané */}
                    <div
                      className="flex shrink-0 items-center"
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 3,
                        background: "var(--card-raised)",
                      }}
                    >
                      <form action={setGearClaim}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="qty" value={Math.max(0, myQty - 1)} />
                        <button
                          type="submit"
                          disabled={myQty <= 0}
                          aria-label={`Enlever une unité de ${item.name}`}
                          className="flex items-center justify-center text-[0.95rem] disabled:opacity-30"
                          style={{ width: 36, height: 36, color: "var(--accent)" }}
                        >
                          −
                        </button>
                      </form>
                      <span
                        className="text-center text-sm font-bold"
                        style={{ width: 24 }}
                        aria-live="polite"
                      >
                        {myQty}
                      </span>
                      <form action={setGearClaim}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="qty" value={Math.min(99, myQty + 1)} />
                        <button
                          type="submit"
                          disabled={myQty >= 99}
                          aria-label={`Ajouter une unité de ${item.name}`}
                          className="flex items-center justify-center text-[0.95rem] disabled:opacity-30"
                          style={{ width: 36, height: 36, color: "var(--accent)" }}
                        >
                          +
                        </button>
                      </form>
                    </div>
                  </div>
                  {(isAdmin || item.createdById === me.id) && (
                    <details className="text-xs">
                      <summary className="muted cursor-pointer select-none">
                        ✏️ Modifier / supprimer
                      </summary>
                      <div className="flex flex-col gap-2 mt-2">
                        <form action={updateGearItem} className="flex flex-col gap-2">
                          <input type="hidden" name="tripId" value={tripId} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <input
                            name="name"
                            className="input !py-1"
                            defaultValue={item.name}
                            required
                          />
                          <div className="flex gap-2">
                            <select
                              name="categoryId"
                              className="input !py-1"
                              defaultValue={item.categoryId}
                            >
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
                              defaultValue={item.qtyRequired}
                              className="input !w-20 !py-1"
                              title="Quantité requise"
                            />
                            <SubmitButton className="btn-ghost !min-h-0 !py-1 shrink-0" savedLabel="✓ Modifié">Modifier</SubmitButton>
                          </div>
                        </form>
                        <form action={deleteGearItem} className="self-end">
                          <input type="hidden" name="tripId" value={tripId} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <button
                            className="btn-ghost !min-h-0 !py-1"
                            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                          >
                            Supprimer l&apos;item
                          </button>
                        </form>
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Gestion de la liste — admin uniquement (les participants ajustent leurs quantités) */}
      {isAdmin && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <h2 className="eyebrow whitespace-nowrap">Gestion · admin</h2>
            <span className="flex-1 h-px" style={{ background: "var(--hair)" }} />
          </div>

          <form action={addGearItem} className="card-dashed flex flex-col gap-2.5">
            <input type="hidden" name="tripId" value={tripId} />
            <p className="eyebrow">Ajouter un item</p>
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
        </div>
      )}
    </div>
  );
}
