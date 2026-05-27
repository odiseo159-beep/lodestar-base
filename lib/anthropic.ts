import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY is not set — LLM extraction will fail.");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "missing",
});

/**
 * Model identifiers — sourced from the project env conventions.
 * Sonnet for reasoning, Haiku for cheap batch extraction.
 */
export const MODELS = {
  reasoning: "claude-sonnet-4-5",
  extraction: "claude-sonnet-4-5",
} as const;
