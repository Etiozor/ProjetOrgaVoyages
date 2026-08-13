import { redirect } from "next/navigation";
import { consumeMagicLink } from "@/lib/magiclink";
import { writeSession } from "@/lib/session";

// Cible du magic link : valide le jeton, ouvre la session et redirige.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await consumeMagicLink(token);
  if (!result.ok || !result.userId) {
    redirect("/login?error=link");
  }
  await writeSession({ uid: result.userId });
  redirect(result.next || "/");
}
