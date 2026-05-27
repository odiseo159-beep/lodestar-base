import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { DEFAULT_AXES, type ProfileAxes } from "./types";

export async function getProfileAxes(userId: string): Promise<ProfileAxes> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (rows.length === 0) return DEFAULT_AXES;
  const raw = rows[0].axes as Partial<ProfileAxes> | null;
  return { ...DEFAULT_AXES, ...(raw ?? {}) };
}

export async function upsertProfileAxes(
  userId: string,
  axes: ProfileAxes
): Promise<void> {
  await db
    .insert(profiles)
    .values({ userId, axes, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { axes, updatedAt: new Date() },
    });
}

/**
 * Lightweight signal: has the user filled in anything beyond defaults?
 */
export function isProfileMeaningful(axes: ProfileAxes): boolean {
  return (
    axes.stacks.length > 0 ||
    axes.domains.length > 0 ||
    axes.audience.length > 0 ||
    axes.maturityPreference !== "any" ||
    (axes.notes ?? "").trim().length > 10
  );
}
