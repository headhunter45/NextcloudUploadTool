import React, { useState } from "react";
import { ReleaseMetadata } from "./releases";

interface MarkdownRendererProps {
  markdown: string;
  release: ReleaseMetadata;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      tokens.push(
        <strong key={key++} className="font-semibold text-slate-900 dark:text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      tokens.push(
        <code
          key={key++}
          className="rounded bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 text-[0.85em] font-mono text-sky-700 dark:text-sky-300"
        >
          {match[3]}
        </code>
      );
    } else if (match[4] !== undefined && match[5] !== undefined) {
      const href = match[5];
      tokens.push(
        <a
          key={key++}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="font-medium text-sky-600 dark:text-sky-400 underline decoration-sky-500/40 underline-offset-4 hover:decoration-sky-500"
        >
          {match[4]}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  markdown,
  release,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const normalizedMd = markdown
    .replace(/majinnaibu\/nextcloud-upload-tool/g, release.repo)
    .replace(/0\.1\.0/g, release.version);

  const lines = normalizedMd.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  while (i < lines.length) {
    const line = lines[i];

    // Skip top-level H1 since the doc viewer header renders the page title
    if (line.startsWith("# ")) {
      i++;
      continue;
    }

    if (line.trim() === "" || line.trim() === "---") {
      if (line.trim() === "---") {
        elements.push(
          <hr
            key={blockKey++}
            className="my-8 border-slate-200 dark:border-slate-800"
          />
        );
      }
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim() || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const codeText = codeLines.join("\n");
      const currentIdx = blockKey++;

      elements.push(
        <div
          key={currentIdx}
          className="my-4 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
            <span className="font-mono uppercase tracking-wider">{lang}</span>
            <button
              type="button"
              onClick={() => handleCopy(codeText, currentIdx)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
            >
              {copiedIndex === currentIdx ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <pre
            tabIndex={0}
            className="p-4 text-sm leading-relaxed text-slate-100 overflow-x-auto"
          >
            <code>{codeText}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Standalone Markdown Image: ![alt](src)
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      let src = imgMatch[2];
      if (src.startsWith("assets/")) {
        const filename = src.replace(/^assets\//, "");
        src = `${import.meta.env.BASE_URL}assets/screenshots/${filename}`;
      }
      elements.push(
        <figure
          key={blockKey++}
          className="my-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900/40 p-3 shadow-md"
        >
          <img
            src={src}
            alt={alt}
            width={960}
            height={740}
            loading="lazy"
            className="w-full h-auto rounded-lg border border-slate-700/60"
          />
          {alt && (
            <figcaption className="mt-2.5 text-center text-xs text-slate-500 dark:text-slate-400">
              {alt}
            </figcaption>
          )}
        </figure>
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={blockKey++}
          className="mt-8 mb-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white"
        >
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={blockKey++}
          className="mt-6 mb-2 text-base font-semibold text-slate-800 dark:text-slate-100"
        >
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // Unordered or Ordered Lists
    if (/^(\s*[-*]|\s*\d+\.)\s+/.test(line)) {
      const isOrdered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(\s*[-*]|\s*\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^(\s*[-*]|\s*\d+\.)\s+/, ""));
        i++;
      }
      const ListTag = isOrdered ? "ol" : "ul";
      elements.push(
        <ListTag
          key={blockKey++}
          className={`my-3 pl-6 space-y-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 ${
            isOrdered ? "list-decimal" : "list-disc"
          }`}
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p
        key={blockKey++}
        className="my-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
      >
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="doc-content">{elements}</div>;
};

