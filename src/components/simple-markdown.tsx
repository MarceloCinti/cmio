import type { ReactNode } from "react";

/**
 * Renderiza texto con un subconjunto mínimo de Markdown ("## " títulos, "- " listas,
 * párrafos) sin interpretar HTML, para evitar inyección de código.
 */
export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  let paragraph: string[] = [];
  const flushList = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`}>
          {list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(<p key={`p-${out.length}`}>{paragraph.join(" ")}</p>);
      paragraph = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      flushParagraph();
    } else if (line.startsWith("## ")) {
      flushList();
      flushParagraph();
      out.push(<h2 key={`h-${out.length}`}>{line.slice(3)}</h2>);
    } else if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushList();
  flushParagraph();
  return <div className="prose-cmio">{out}</div>;
}
