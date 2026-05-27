"use client";

import { useState } from "react";

type ScaffoldFile = { path: string; content: string };
type ScaffoldInspiration = {
  title: string;
  url: string;
  whatWeBorrowed: string;
};

export type Scaffold = {
  projectName: string;
  description: string;
  stack: string[];
  setup: string[];
  files: ScaffoldFile[];
  inspiredBy: ScaffoldInspiration[];
};

export default function ScaffoldPanel({
  scaffold,
  onClose,
}: {
  scaffold: Scaffold;
  onClose: () => void;
}) {
  const [openFile, setOpenFile] = useState<string | null>(
    scaffold.files[0]?.path ?? null
  );
  const [downloading, setDownloading] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  async function downloadZip() {
    setDownloading(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const f of scaffold.files) {
        zip.file(f.path, f.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${scaffold.projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function copy(text: string, path: string) {
    await navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath((c) => (c === path ? null : c)), 1500);
  }

  return (
    <div className="border border-accent flex flex-col max-h-[calc(100vh-6rem)]">
      {/* terminal-style title bar */}
      <div className="bg-screen-2 border-b border-rule px-3 py-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-faint">
        <div className="flex items-center gap-2">
          <span className="text-accent">●</span>
          <span>scaffold</span>
          <span>/</span>
          <span className="text-ink">{scaffold.projectName}</span>
        </div>
        <button
          onClick={onClose}
          className="text-ink-dim hover:text-ink"
          title="close"
        >
          [×]
        </button>
      </div>

      <div className="px-4 py-4 border-b border-rule">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="text-ink text-base">
              <span className="text-accent">$</span> npm create{" "}
              <span className="text-ink">{scaffold.projectName}</span>
            </h2>
            <p className="mt-1 text-xs text-ink-dim">{scaffold.description}</p>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wide">
              {scaffold.stack.map((s) => (
                <span key={s} className="text-accent">
                  · {s}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={downloadZip}
            disabled={downloading}
            className="px-3 py-1.5 text-xs border border-accent text-accent hover:bg-accent hover:text-screen disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {downloading
              ? "zipping…"
              : `$ download ${scaffold.files.length} files`}
          </button>
        </div>
      </div>

      {scaffold.setup.length > 0 && (
        <div className="px-4 py-3 border-b border-rule bg-screen-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-ink-faint">
              setup
            </span>
            <button
              onClick={() => copy(scaffold.setup.join("\n"), "__setup__")}
              className="text-[10px] text-ink-dim hover:text-ink uppercase tracking-wide"
            >
              {copiedPath === "__setup__" ? "[copied]" : "[copy]"}
            </button>
          </div>
          <pre className="text-xs text-ink leading-relaxed">
            {scaffold.setup
              .map(
                (cmd) =>
                  `${""}`.replace(/./g, "") +
                  ""
              )
              .join("")}
            {scaffold.setup.map((cmd, i) => (
              <div key={i}>
                <span className="text-accent">$</span>{" "}
                <span className="text-ink-dim">{cmd}</span>
              </div>
            ))}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-[150px_minmax(0,1fr)] divide-x divide-rule flex-1 min-h-0">
        <ul className="bg-screen p-1 overflow-y-auto">
          {scaffold.files.map((f) => (
            <li key={f.path}>
              <button
                onClick={() =>
                  setOpenFile((cur) => (cur === f.path ? null : f.path))
                }
                className={`w-full text-left px-2 py-1 text-[11px] truncate ${
                  openFile === f.path
                    ? "text-accent border-l-2 border-accent bg-screen-2"
                    : "text-ink-dim hover:text-ink border-l-2 border-transparent"
                }`}
                title={f.path}
              >
                {f.path}
              </button>
            </li>
          ))}
        </ul>
        <div className="overflow-auto bg-screen min-w-0">
          {openFile ? (
            <FileView
              file={scaffold.files.find((f) => f.path === openFile)!}
              copied={copiedPath === openFile}
              onCopy={() =>
                copy(
                  scaffold.files.find((f) => f.path === openFile)!.content,
                  openFile
                )
              }
            />
          ) : (
            <div className="p-6 text-xs text-ink-faint">
              select a file from the list
            </div>
          )}
        </div>
      </div>

      {scaffold.inspiredBy.length > 0 && (
        <div className="px-4 py-3 border-t border-rule bg-screen-2">
          <span className="text-[10px] uppercase tracking-widest text-ink-faint">
            inspired by
          </span>
          <ul className="mt-2 space-y-1">
            {scaffold.inspiredBy.map((ins, i) => (
              <li key={i} className="text-[11px] text-ink-dim">
                <span className="text-ink-faint">·</span>{" "}
                <a
                  href={ins.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent no-underline hover:underline"
                >
                  {ins.title}
                </a>
                <span className="text-ink-faint"> — {ins.whatWeBorrowed}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FileView({
  file,
  copied,
  onCopy,
}: {
  file: ScaffoldFile;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between sticky top-0 bg-screen-2 border-b border-rule px-3 py-1.5">
        <span className="text-[11px] text-ink">
          <span className="text-accent">▸</span> {file.path}
        </span>
        <button
          onClick={onCopy}
          className="text-[10px] text-ink-dim hover:text-ink uppercase tracking-wide"
        >
          {copied ? "[copied]" : "[copy]"}
        </button>
      </div>
      <pre className="text-[11px] p-3 whitespace-pre break-words text-ink bg-screen leading-relaxed overflow-x-auto">
        {file.content}
      </pre>
    </div>
  );
}
