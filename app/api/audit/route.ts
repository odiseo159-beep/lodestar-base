import { z } from "zod";
import {
  fetchRepoContent,
  inferPeerQuery,
  parseRepoUrl,
} from "@/lib/sources/github-repo";
import { searchAllSources } from "@/lib/sources";
import { extractMetadataForItems } from "@/lib/agent/extract";
import { generateAudit } from "@/lib/agent/audit";
import { auth } from "@/lib/auth";
import { getProfileAxes } from "@/lib/profile/repository";
import { DEFAULT_AXES } from "@/lib/profile/types";

const bodySchema = z.object({
  repoUrl: z.string().min(3).max(300),
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

  const parsedRepo = parseRepoUrl(parsed.data.repoUrl);
  if (!parsedRepo) {
    return Response.json(
      {
        error:
          "Could not parse repo URL. Use https://github.com/owner/repo or owner/repo.",
      },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch the target repo's content
    const target = await fetchRepoContent(parsedRepo.owner, parsedRepo.repo);

    // 2. Infer a peer query from repo metadata
    const inferredQuery = inferPeerQuery(target);
    if (inferredQuery.length < 3) {
      return Response.json(
        {
          error:
            "Could not infer a meaningful query from the repo's metadata (no description / topics / language).",
        },
        { status: 400 }
      );
    }

    // 3. Fetch profile (for personalized suggestions)
    const session = await auth();
    const profile = session?.user?.id
      ? await getProfileAxes(session.user.id)
      : DEFAULT_AXES;

    // 4. Discover peers (skip Reddit — noisier, peers are usually code repos)
    const peersRaw = await searchAllSources(inferredQuery, {
      sources: ["github", "hn"],
      perSourceLimit: 8,
    });

    // 5. Drop the target repo from peers if it accidentally surfaced
    const peersFiltered = peersRaw.filter(
      (it) =>
        !it.url
          .toLowerCase()
          .includes(`/${parsedRepo.owner}/${parsedRepo.repo}`.toLowerCase())
    );

    // 6. Extract metadata so the auditor has rich context
    const peersEnriched = await extractMetadataForItems(
      inferredQuery,
      peersFiltered.slice(0, 10),
      profile
    ).catch((err) => {
      console.error("Peer extraction failed during audit:", err);
      return peersFiltered.slice(0, 10);
    });

    // 7. Run the audit LLM
    const audit = await generateAudit(
      target,
      peersEnriched,
      inferredQuery,
      profile
    );

    return Response.json({ audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Audit failed:", err);
    return Response.json(
      { error: `Audit failed: ${message}` },
      { status: 500 }
    );
  }
}
