import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getProfileAxes,
  upsertProfileAxes,
} from "@/lib/profile/repository";

const axesSchema = z.object({
  stacks: z.array(z.string()).max(20).default([]),
  domains: z.array(z.string()).max(15).default([]),
  audience: z.array(z.string()).max(10).default([]),
  noveltyWeight: z.number().min(0).max(1).default(0.5),
  maturityPreference: z
    .enum(["any", "toy", "early", "production"])
    .default("any"),
  onchainImportance: z.number().min(0).max(1).default(0.5),
  excludedTopics: z.array(z.string()).max(20).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const axes = await getProfileAxes(session.user.id);
  return Response.json({ axes });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = axesSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  await upsertProfileAxes(session.user.id, parsed.data);
  return Response.json({ ok: true, axes: parsed.data });
}
