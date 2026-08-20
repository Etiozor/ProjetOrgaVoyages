import net from "node:net";
import dns from "node:dns";
import dnsp from "node:dns/promises";

// ⚠️ ROUTE DE DIAGNOSTIC TEMPORAIRE — à SUPPRIMER après usage.
// Teste, depuis le conteneur dev, la résolution DNS et la connectivité TCP
// sortante vers le SMTP. Ne révèle aucun secret (seulement des booléens).
// Protégée par un jeton trivial pour éviter l'exposition publique.

const HOST = "smtp.gmail.com";

function tcpProbe(
  host: string,
  port: number,
  family: 0 | 4 | 6,
  timeoutMs = 6000
): Promise<{ ok: boolean; ms: number; ip?: string; error?: string }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const opts: net.NetConnectOpts = { host, port };
    if (family) opts.family = family;
    const socket = net.connect(opts);
    let done = false;
    const finish = (r: { ok: boolean; error?: string }) => {
      if (done) return;
      done = true;
      const ip = socket.remoteAddress;
      socket.destroy();
      resolve({ ok: r.ok, ms: Date.now() - started, ip, error: r.error });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish({ ok: true }));
    socket.once("timeout", () => finish({ ok: false, error: "timeout" }));
    socket.once("error", (e: NodeJS.ErrnoException) =>
      finish({ ok: false, error: `${e.code ?? ""} ${e.message}`.trim() })
    );
  });
}

export async function GET(request: Request) {
  // Garde-fou minimal : ?token=diag
  const token = new URL(request.url).searchParams.get("token");
  if (token !== "diag") {
    return new Response("nope", { status: 403 });
  }

  let a: string[] = [];
  let aaaa: string[] = [];
  let resolveErr: string | undefined;
  try {
    a = await dnsp.resolve4(HOST);
  } catch (e) {
    resolveErr = `A: ${(e as Error).message}`;
  }
  try {
    aaaa = await dnsp.resolve6(HOST);
  } catch (e) {
    resolveErr = `${resolveErr ?? ""} AAAA: ${(e as Error).message}`.trim();
  }

  const result = {
    node: process.version,
    nodeOptions: process.env.NODE_OPTIONS ?? null,
    dnsDefaultOrder: dns.getDefaultResultOrder(),
    env: {
      SMTP_USER: Boolean(process.env.SMTP_USER),
      SMTP_PASS: Boolean(process.env.SMTP_PASS),
      SMTP_HOST: process.env.SMTP_HOST ?? null,
      SMTP_PORT: process.env.SMTP_PORT ?? null,
      APP_URL: process.env.APP_URL ?? null,
    },
    dns: { A: a, AAAA: aaaa, resolveErr },
    probes: {
      "465_ipv4": await tcpProbe(HOST, 465, 4),
      "587_ipv4": await tcpProbe(HOST, 587, 4),
      "465_default": await tcpProbe(HOST, 465, 0),
      // Témoin « sortie internet OK » : 443 vers un hôte HTTPS toujours ouvert.
      "443_control": await tcpProbe("www.google.com", 443, 4),
    },
  };

  return Response.json(result);
}
