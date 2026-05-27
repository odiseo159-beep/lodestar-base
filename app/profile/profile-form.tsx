"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AUDIENCE_SUGGESTIONS,
  DEFAULT_AXES,
  DOMAIN_SUGGESTIONS,
  STACK_SUGGESTIONS,
  type ProfileAxes,
} from "@/lib/profile/types";

export default function ProfileForm({ initial }: { initial: ProfileAxes }) {
  const [axes, setAxes] = useState<ProfileAxes>({
    ...DEFAULT_AXES,
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(axes),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.formErrors?.[0] ?? "Save failed");
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="border-b border-rule bg-screen text-[11px] text-ink-dim">
        <div className="px-4 lg:px-6 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-accent">●</span>
            <span>lodestar</span>
            <span>/</span>
            <span>profile</span>
          </div>
          <Link
            href="/"
            className="text-ink-dim hover:text-ink no-underline"
          >
            ← back to discover
          </Link>
        </div>
      </div>

      <main className="min-h-screen bg-screen px-4 lg:px-6 py-6">
        <div className="max-w-3xl">
          <div className="mb-8">
            <div className="flex items-baseline gap-2">
              <span className="text-accent text-sm">~/profile</span>
              <h1 className="text-2xl text-ink font-medium tracking-tight">
                your profile
              </h1>
              <span className="term-cursor" />
            </div>
            <p className="mt-2 text-sm text-ink-dim max-w-2xl">
              The agent reads this when scoring relevance. Same query, your
              profile → different ranking.
            </p>
          </div>

          <div className="space-y-8 border border-rule p-6">
            <ChipPicker
              label="stacks"
              help="Items using these get a ranking boost."
              suggestions={STACK_SUGGESTIONS}
              value={axes.stacks}
              onChange={(stacks) => setAxes((a) => ({ ...a, stacks }))}
            />

            <ChipPicker
              label="domains"
              help="The agent surfaces more from these areas."
              suggestions={DOMAIN_SUGGESTIONS}
              value={axes.domains}
              onChange={(domains) => setAxes((a) => ({ ...a, domains }))}
            />

            <ChipPicker
              label="i build for"
              help="Audience match adds relevance."
              suggestions={AUDIENCE_SUGGESTIONS}
              value={axes.audience}
              onChange={(audience) => setAxes((a) => ({ ...a, audience }))}
            />

            <SliderField
              label="novelty appetite"
              help={
                axes.noveltyWeight < 0.3
                  ? "prefer stable, battle-tested patterns"
                  : axes.noveltyWeight > 0.7
                    ? "show me cutting-edge experiments"
                    : "balanced mix"
              }
              value={axes.noveltyWeight}
              onChange={(noveltyWeight) =>
                setAxes((a) => ({ ...a, noveltyWeight }))
              }
            />

            <SliderField
              label="onchain importance"
              help={
                axes.onchainImportance < 0.3
                  ? "don't care about onchain signal"
                  : axes.onchainImportance > 0.7
                    ? "strongly prefer creators with verified Base activity"
                    : "use onchain as a tiebreaker"
              }
              value={axes.onchainImportance}
              onChange={(onchainImportance) =>
                setAxes((a) => ({ ...a, onchainImportance }))
              }
            />

            <RadioField
              label="maturity preference"
              value={axes.maturityPreference}
              options={[
                { value: "any", label: "any" },
                { value: "toy", label: "toy" },
                { value: "early", label: "early" },
                { value: "production", label: "prod" },
              ]}
              onChange={(maturityPreference) =>
                setAxes((a) => ({
                  ...a,
                  maturityPreference:
                    maturityPreference as ProfileAxes["maturityPreference"],
                }))
              }
            />

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-faint mb-2">
                exclude
              </label>
              <input
                type="text"
                value={(axes.excludedTopics ?? []).join(", ")}
                onChange={(e) =>
                  setAxes((a) => ({
                    ...a,
                    excludedTopics: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="memecoins, courses, tutorials"
                className="w-full px-3 py-2 text-sm border border-rule focus:border-accent bg-screen text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-ink-faint">
                comma-separated. items mentioning these get a penalty.
              </p>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-faint mb-2">
                about you (read by the agent)
              </label>
              <textarea
                value={axes.notes ?? ""}
                onChange={(e) =>
                  setAxes((a) => ({ ...a, notes: e.target.value }))
                }
                rows={3}
                maxLength={500}
                placeholder="i build agent infra at a YC startup; researching x402 for billing."
                className="w-full px-3 py-2 text-sm border border-rule focus:border-accent bg-screen text-ink placeholder:text-ink-faint focus:outline-none resize-y"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-screen disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent transition-colors text-xs"
            >
              {saving ? "saving …" : "$ save profile"}
            </button>
            {savedAt && (
              <span className="text-xs text-grow">
                ● saved {savedAt.toLocaleTimeString()}
              </span>
            )}
            {error && (
              <span className="text-xs text-err">
                <span className="text-ink-faint">ERR:</span> {error}
              </span>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function ChipPicker({
  label,
  help,
  suggestions,
  value,
  onChange,
}: {
  label: string;
  help: string;
  suggestions: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const valueSet = new Set(value.map((s) => s.toLowerCase()));

  function toggle(item: string) {
    if (valueSet.has(item.toLowerCase())) {
      onChange(value.filter((v) => v.toLowerCase() !== item.toLowerCase()));
    } else {
      onChange([...value, item]);
    }
  }

  function addCustom() {
    const v = custom.trim();
    if (!v || valueSet.has(v.toLowerCase())) return;
    onChange([...value, v]);
    setCustom("");
  }

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-ink-faint mb-1">
        {label}
      </label>
      <p className="text-[11px] text-ink-faint mb-2">{help}</p>
      <div className="flex flex-wrap gap-1">
        {suggestions.map((s) => {
          const active = valueSet.has(s.toLowerCase());
          return (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={`px-2 py-0.5 text-[11px] border transition-colors ${
                active
                  ? "border-accent text-accent bg-accent/10"
                  : "border-rule text-ink-dim hover:text-ink hover:border-rule-hot"
              }`}
            >
              {active ? "✓ " : ""}
              {s}
            </button>
          );
        })}
        {value
          .filter(
            (v) =>
              !suggestions.some((s) => s.toLowerCase() === v.toLowerCase())
          )
          .map((v) => (
            <button
              key={v}
              onClick={() => toggle(v)}
              className="px-2 py-0.5 text-[11px] border border-accent text-accent bg-accent/10"
            >
              ✓ {v} ×
            </button>
          ))}
      </div>
      <div className="mt-2 flex gap-1">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="add custom…"
          className="px-2 py-1 text-[11px] border border-rule focus:border-accent bg-screen text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          onClick={addCustom}
          className="px-2 py-1 text-[11px] border border-rule text-ink-dim hover:text-ink hover:border-rule-hot"
        >
          add
        </button>
      </div>
    </div>
  );
}

function SliderField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] uppercase tracking-widest text-ink-faint">
          {label}
        </label>
        <span className="text-[11px] text-accent tabular-nums">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent"
      />
      <p className="mt-1 text-[11px] text-ink-faint">{help}</p>
    </div>
  );
}

function RadioField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-ink-faint mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`px-3 py-1 text-[11px] border transition-colors ${
                active
                  ? "border-accent text-accent bg-accent/10"
                  : "border-rule text-ink-dim hover:text-ink hover:border-rule-hot"
              }`}
            >
              {active ? "[ ✓ " : "[ "}
              {o.label}
              {active ? " ]" : " ]"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
