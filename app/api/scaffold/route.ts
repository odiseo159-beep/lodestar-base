import { z } from "zod";
import { generateScaffold } from "@/lib/agent/scaffold";
import { auth } from "@/lib/auth";
import { getProfileAxes } from "@/lib/profile/repository";
import { DEFAULT_AXES } from "@/lib/profile/types";
import type { UnifiedItem } from "@/lib/sources/types";

const bodySchema = z.object({
  query: z.string().min(2).max(200),
  items: z
    .array(
      z.object({
        id: z.string(),
        source: z.string(),
        externalId: z.string(),
        title: z.string(),
        url: z.string(),
        description: z.string().nullable().optional(),
        author: z.object({
          handle: z.string(),
          avatarUrl: z.string().nullable().optional(),
          profileUrl: z.string().nullable().optional(),
        }),
        signals: z.record(z.string(), z.unknown()).optional(),
        language: z.string().nullable().optional(),
        topics: z.array(z.string()).optional(),
        createdAt: z.string().nullable().optional(),
        extracted: z
          .object({
            stack: z.array(z.string()),
            purpose: z.string(),
            novelty: z.number(),
            maturity: z.enum(["toy", "early", "production"]),
            audience: z.array(z.string()),
            relevance: z.number(),
          })
          .optional(),
      })
    )
    .min(1)
    .max(10),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const session = await auth();
  const profile = session?.user?.id
    ? await getProfileAxes(session.user.id)
    : DEFAULT_AXES;

  try {
    const scaffold = await generateScaffold(
      parsed.data.query,
      parsed.data.items as unknown as UnifiedItem[],
      profile
    );
    return Response.json({ scaffold });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Scaffold generation failed:", err);
    return Response.json(
      { error: `Scaffold failed: ${message}` },
      { status: 500 }
    );
  }
}
