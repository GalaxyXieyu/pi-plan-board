/** A tiny, safe markdown view for the plan summary: headings, lists, bold, code. No HTML is ever injected. */
import { createElement as h } from "react";

function inline(text, keyBase) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    parts.push(token.startsWith("**") ? h("strong", { key: `${keyBase}-${k++}` }, token.slice(2, -2)) : h("code", { key: `${keyBase}-${k++}` }, token.slice(1, -1)));
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ source }) {
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(h(list.ordered ? "ol" : "ul", { key: `l${blocks.length}` }, list.items)); list = null; } };
  source.split("\n").forEach((line, i) => {
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (heading) { flush(); blocks.push(h(`h${Math.min(6, heading[1].length + 3)}`, { key: i }, inline(heading[2], i))); return; }
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push(h("li", { key: i }, inline((bullet || numbered)[1], i)));
      return;
    }
    flush();
    if (line.trim()) blocks.push(h("p", { key: i }, inline(line, i)));
  });
  flush();
  return h("div", { className: "pb-md" }, blocks);
}
