import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Une seule instance par process (le hot-reload de dev recharge les modules)
const g = globalThis as unknown as { __tripinPrisma?: PrismaClient };

export const prisma =
  g.__tripinPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      // Les proxys (Docker Desktop, Railway) coupent les connexions inactives :
      // keepalive TCP, purge rapide des clients oisifs, et échec franc plutôt
      // qu'une attente infinie si le pool est saturé.
      keepAlive: true,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      maxLifetimeSeconds: 300,
    }),
  });

if (process.env.NODE_ENV !== "production") g.__tripinPrisma = prisma;
