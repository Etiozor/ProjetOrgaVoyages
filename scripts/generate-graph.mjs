#!/usr/bin/env node
// Régénère les notes "code" du vault Obsidian TRIP'IN à partir du code source.
// - Dérivé du code (déterministe) : Domaine/ Pages/ Composants/ Lib/ + hubs.
// - Jamais touché : Projet/ Roadmap/ Requirements/ Decisions/ Tickets/ Infra/.
// - Chaque note = bloc AUTO (régénéré) + bloc LIBRE (préservé, prose libre).
//   Au 1er passage, la prose existante est migrée dans le bloc LIBRE.
//
// Lancé par `npm run graph` ou par le hook git post-commit.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(REPO, "src");
const SCHEMA = path.join(REPO, "prisma", "schema.prisma");
const VAULT = path.resolve(REPO, "..", "TRIPIN-Vault");

// --- Noms d'affichage stables des routes (doivent matcher les liens des notes produit) ---
const PAGE_NAMES = {
  "page.tsx": "Accueil",
  "layout.tsx": "Layout racine",
  "login/page.tsx": "Login",
  "join/page.tsx": "Join",
  "new/page.tsx": "Nouveau voyage",
  "verify/page.tsx": "Vérif e-mail (page)",
  "auth/verify/route.ts": "Route magic link",
  "t/[tripId]/layout.tsx": "Layout voyage",
  "t/[tripId]/page.tsx": "Dashboard voyage",
  "t/[tripId]/admin/page.tsx": "Admin",
  "t/[tripId]/carpool/page.tsx": "Covoiturage",
  "t/[tripId]/meals/page.tsx": "Repas",
  "t/[tripId]/tents/page.tsx": "Tentes",
  "t/[tripId]/participants/page.tsx": "Participants (page)",
  "t/[tripId]/gear/page.tsx": "Matériel",
};

const AUTO_START = "<!-- AUTO:START (généré depuis le code — ne pas éditer à la main) -->";
const AUTO_END = "<!-- AUTO:END -->";
const LIBRE_START = "<!-- LIBRE:START (édite librement — préservé à la régénération) -->";
const LIBRE_END = "<!-- LIBRE:END -->";
const LIBRE_PLACEHOLDER =
  "_(Notes libres — écris ici, ce bloc est préservé à chaque régénération.)_";

// ---------- utilitaires fichiers ----------
const readIf = (p) => {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
};
const listMd = (dir) => {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
};
const walk = (dir) => {
  const out = [];
  const rec = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) rec(full);
      else out.push(full);
    }
  };
  if (fs.existsSync(dir)) rec(dir);
  return out;
};

// Récupère la prose LIBRE d'une note existante (ou migre le corps hérité).
function extractLibre(content) {
  if (!content) return "";
  const m = content.match(
    /<!-- LIBRE:START[^\n]*-->\n?([\s\S]*?)\n?<!-- LIBRE:END -->/
  );
  if (m) return m[1].trim();
  // Note héritée sans marqueurs : on migre son corps (hors frontmatter + titre + éventuel bloc AUTO).
  let c = content.replace(/^---\n[\s\S]*?\n---\n/, "");
  c = c.replace(/^#\s+.*\n/, "");
  c = c.replace(/<!-- AUTO:START[\s\S]*?<!-- AUTO:END -->\n?/, "");
  return c.trim();
}

function buildNote({ tags, title, auto, existing }) {
  const libre = extractLibre(existing) || LIBRE_PLACEHOLDER;
  return (
    `---\ntags: [${tags}]\n---\n# ${title}\n\n` +
    `${AUTO_START}\n${auto.trim()}\n${AUTO_END}\n\n` +
    `${LIBRE_START}\n${libre}\n${LIBRE_END}\n`
  );
}

const links = (arr) => arr.map((x) => `[[${x}]]`).join(" · ");

function writeNote(relPath, tags, title, auto) {
  const full = path.join(VAULT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buildNote({ tags, title, auto, existing: readIf(full) }));
}

// Supprime dans `folder` les .md qui ne sont plus attendus.
function prune(folder, keepBasenames) {
  const dir = path.join(VAULT, folder);
  for (const f of listMd(dir)) {
    if (!keepBasenames.has(f)) fs.rmSync(path.join(dir, f));
  }
}

// ---------- analyse des imports d'un fichier TS/TSX ----------
function depsOf(file) {
  const content = readIf(file) || "";
  const lib = new Set();
  const comp = new Set();
  const re = /from\s+["']([^"']+)["']/g;
  let m;
  const selfBase = path.basename(file).replace(/\.(tsx?|ts)$/, "");
  while ((m = re.exec(content))) {
    const spec = m[1];
    let base = null;
    let kind = null;
    if (spec.startsWith("@/lib/")) {
      base = spec.slice("@/lib/".length);
      kind = "lib";
    } else if (spec.startsWith("@/components/")) {
      base = spec.slice("@/components/".length);
      kind = "comp";
    } else if (/^\.\.?\//.test(spec) && file.includes(`${path.sep}lib${path.sep}`)) {
      // import relatif à l'intérieur de lib/
      base = spec.replace(/^.*\//, "");
      kind = "lib";
    }
    if (!base) continue;
    base = base.replace(/\.(tsx?|ts)$/, "");
    if (base === selfBase) continue;
    (kind === "lib" ? lib : comp).add(base);
  }
  return { lib: [...lib].sort(), comp: [...comp].sort() };
}

// ---------- 1) Domaine (Prisma) ----------
function parseModels() {
  const schema = readIf(SCHEMA) || "";
  const lines = schema.split(/\r?\n/);
  const names = new Set();
  for (const l of lines) {
    const m = l.match(/^model\s+(\w+)\s*\{/);
    if (m) names.add(m[1]);
  }
  const models = [];
  let pendingDoc = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const md = line.match(/^model\s+(\w+)\s*\{/);
    if (md) {
      const name = md[1];
      const desc = pendingDoc.join(" ").trim();
      pendingDoc = [];
      const scalars = [];
      const rels = new Set();
      i++;
      for (; i < lines.length && lines[i].trim() !== "}"; i++) {
        const t = lines[i].trim();
        if (!t || t.startsWith("//") || t.startsWith("@@")) continue;
        const tok = t.split(/\s+/);
        const field = tok[0];
        const type = (tok[1] || "").replace(/[\[\]?]/g, "");
        if (names.has(type)) rels.add(type);
        else scalars.push(field);
      }
      models.push({ name, desc, scalars, rels: [...rels].sort() });
      continue;
    }
    const t = line.trim();
    if (t.startsWith("///")) pendingDoc.push(t.replace(/^\/\/\/\s?/, ""));
    else pendingDoc = [];
  }
  return models.sort((a, b) => a.name.localeCompare(b.name));
}

function genDomaine(models) {
  const keep = new Set();
  for (const m of models) {
    let auto = `${m.desc ? m.desc + " " : ""}Entité. Fait partie de [[Domaine]].`;
    if (m.scalars.length) auto += `\n\n**Champs** : ${m.scalars.join(", ")}`;
    if (m.rels.length) auto += `\n\n**Relations** : ${links(m.rels)}`;
    writeNote(`Domaine/${m.name}.md`, "entite", m.name, auto);
    keep.add(`${m.name}.md`);
  }
  prune("Domaine", keep);
  return models.map((m) => m.name);
}

// ---------- 2) Pages / 3) Composants / 4) Lib ----------
function relFromApp(file) {
  return path
    .relative(path.join(SRC, "app"), file)
    .split(path.sep)
    .join("/");
}
function pageInfo(file) {
  const rel = relFromApp(file);
  const name = PAGE_NAMES[rel] || rel.replace(/\/(page|layout|route)\.(tsx?|ts)$/, "") || rel;
  const dir = rel.replace(/\/?(page|layout|route)\.(tsx?|ts)$/, "");
  const url = dir === "" ? "/" : "/" + dir;
  const group = rel.startsWith("t/[tripId]") ? "voyage" : "public";
  const kind = rel.endsWith("route.ts") ? "route" : rel.includes("layout") ? "layout" : "page";
  return { rel, name, url, group, kind };
}

function genPages() {
  const files = walk(path.join(SRC, "app")).filter((f) =>
    /(page|layout|route)\.(tsx?|ts)$/.test(f)
  );
  const keep = new Set();
  const infos = [];
  for (const f of files) {
    const info = pageInfo(f);
    const { lib, comp } = depsOf(f);
    let auto = `Route \`${info.url}\` (${info.kind}). Fait partie de [[Pages]].`;
    if (lib.length) auto += `\n\n**Lib** : ${links(lib)}`;
    if (comp.length) auto += `\n\n**Composants** : ${links(comp)}`;
    writeNote(`Pages/${info.name}.md`, "page", info.name, auto);
    keep.add(`${info.name}.md`);
    infos.push(info);
  }
  prune("Pages", keep);
  return infos;
}

function genComponents() {
  const files = walk(path.join(SRC, "components")).filter((f) => /\.tsx?$/.test(f));
  const keep = new Set();
  const names = [];
  for (const f of files) {
    const name = path.basename(f).replace(/\.tsx?$/, "");
    const { lib, comp } = depsOf(f);
    let auto = `Composant React. Fait partie de [[Composants]].`;
    if (lib.length) auto += `\n\n**Lib** : ${links(lib)}`;
    if (comp.length) auto += `\n\n**Composants** : ${links(comp)}`;
    writeNote(`Composants/${name}.md`, "composant", name, auto);
    keep.add(`${name}.md`);
    names.push(name);
  }
  prune("Composants", keep);
  return names.sort();
}

function genLib() {
  const files = walk(path.join(SRC, "lib")).filter((f) => /\.tsx?$/.test(f));
  const keep = new Set();
  const names = [];
  for (const f of files) {
    const name = path.basename(f).replace(/\.tsx?$/, "");
    const { lib } = depsOf(f);
    let auto = `Module. Fait partie de [[Lib]].`;
    if (lib.length) auto += `\n\n**Dépend de** : ${links(lib)}`;
    writeNote(`Lib/${name}.md`, "lib", name, auto);
    keep.add(`${name}.md`);
    names.push(name);
  }
  prune("Lib", keep);
  return names.sort();
}

// ---------- Hubs + god node + graph.json ----------
function writeRaw(relPath, content) {
  const full = path.join(VAULT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function genHubs({ models, pages, comps, libs }) {
  writeRaw(
    "Domaine.md",
    `---\ntags: [moc]\n---\n# Domaine — modèle de données\nModèles [[Prisma + Postgres|Prisma]]. Retour à [[TRIP'IN]].\n\n## Entités\n${links(models)}\n`
  );
  const pub = pages.filter((p) => p.group === "public").map((p) => p.name);
  const voy = pages.filter((p) => p.group === "voyage").map((p) => p.name);
  writeRaw(
    "Pages.md",
    `---\ntags: [moc]\n---\n# Pages — routes App Router\nRetour à [[TRIP'IN]].\n\n## Publiques / auth\n${links(pub)}\n\n## Espace voyage \`/t/[tripId]\`\n${links(voy)}\n`
  );
  writeRaw(
    "Composants.md",
    `---\ntags: [moc]\n---\n# Composants React\nRetour à [[TRIP'IN]].\n\n${links(comps)}\n`
  );
  writeRaw(
    "Lib.md",
    `---\ntags: [moc]\n---\n# Lib — logique & données\nRetour à [[TRIP'IN]].\n\n${links(libs)}\n`
  );
  writeRaw(
    "TRIP'IN.md",
    `---\ntags: [moc, projet]\n---\n# TRIP'IN 🏕️\n\nApplication **Next.js 16** d'organisation de voyages / camps de groupe (« modèle Tricount »).\nCoffre Obsidian — partie *code* régénérée automatiquement depuis le source.\n\n## Le code\n- [[Domaine]] — le modèle de données (Prisma / Postgres)\n- [[Pages]] — les routes de l'app (App Router)\n- [[Composants]] — les composants React\n- [[Lib]] — la logique métier et l'accès données\n- [[Infra]] — la plateforme et les services externes\n\n## Le produit\n- [[Vision produit]] · [[Roadmap]] · [[Requirements]] · [[Décisions]] · [[Tickets]]\n`
  );
}

function genGraphConfig() {
  // Écrit graph.json uniquement s'il n'existe pas, pour ne pas écraser tes réglages Obsidian.
  const target = path.join(VAULT, ".obsidian", "graph.json");
  if (fs.existsSync(target)) return;
  const groups = [
    ["#moc", 14724968],
    ["#entite", 10407530],
    ["#page", 8037111],
    ["#composant", 12294903],
    ["#lib", 16752228],
    ["#infra", 16217742],
    ["#phase", 2802654],
    ["#requirement", 14137981],
    ["#decision", 13007069],
    ["#ticket", 8421504],
  ];
  const cfg = {
    "collapse-filter": true,
    search: "",
    showTags: false,
    showAttachments: false,
    hideUnresolved: false,
    showOrphans: true,
    "collapse-color-groups": false,
    colorGroups: groups.map(([q, rgb]) => ({ query: `tag:${q}`, color: { a: 1, rgb } })),
    "collapse-display": false,
    showArrow: true,
    textFadeMultiplier: 0,
    nodeSizeMultiplier: 1.2,
    lineSizeMultiplier: 1,
    "collapse-forces": false,
    centerStrength: 0.45,
    repelStrength: 13,
    linkStrength: 1,
    linkDistance: 95,
    scale: 0.85,
    close: false,
  };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(cfg, null, 2));
}

// ---------- main ----------
function main() {
  if (!fs.existsSync(SCHEMA)) {
    console.error(`[graph] introuvable : ${SCHEMA} — abandon.`);
    process.exit(0); // ne jamais casser un commit
  }
  fs.mkdirSync(VAULT, { recursive: true });
  const models = genDomaine(parseModels());
  const pages = genPages();
  const comps = genComponents();
  const libs = genLib();
  genHubs({ models, pages, comps, libs });
  genGraphConfig();
  console.log(
    `[graph] vault régénéré : ${models.length} entités · ${pages.length} pages · ${comps.length} composants · ${libs.length} modules lib → ${VAULT}`
  );
}

main();
