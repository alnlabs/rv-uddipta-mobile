const SKIP = new Set(["script", "style", "iframe", "object", "embed"]);
const VOID = new Set(["br", "img", "hr"]);
const BLOCK = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre"]);
const INLINE = new Set(["strong", "b", "em", "i", "u", "s", "strike", "sub", "sup", "a", "span", "code"]);

export type HtmlAttrs = Record<string, string>;

export type HtmlNode =
  | { kind: "text"; text: string }
  | { kind: "el"; tag: string; attrs: HtmlAttrs; children: HtmlNode[] };

function decode(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => char(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => char(parseInt(code, 16)));
}

function char(code: number) {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
  if (code < 32 && code !== 10) return "";
  return String.fromCodePoint(code);
}

function readAttrs(raw: string) {
  const attrs: HtmlAttrs = {};
  const pattern = /([a-z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

export function looksRich(value: string) {
  return /<\/?[a-z][^>]*>/i.test(value);
}

export function htmlToPlain(value: string) {
  return decode(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseHtml(html: string): HtmlNode[] {
  const root: HtmlNode = { kind: "el", tag: "div", attrs: {}, children: [] };
  const stack: Extract<HtmlNode, { kind: "el" }>[] = [root];
  let skip = 0;
  const pattern = /<!--[\s\S]*?-->|<\/([a-z0-9]+)\s*>|<([a-z0-9]+)(\s[^<>]*?)?\s*(\/?)>|([^<]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    if (match[0].startsWith("<!--")) continue;
    if (match[1]) {
      const tag = match[1].toLowerCase();
      if (SKIP.has(tag)) {
        if (skip) skip -= 1;
        continue;
      }
      if (skip) continue;
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].tag !== tag) continue;
        stack.splice(index);
        break;
      }
      continue;
    }
    if (match[2]) {
      const tag = match[2].toLowerCase();
      const self = Boolean(match[4]) || VOID.has(tag);
      if (SKIP.has(tag)) {
        if (!self) skip += 1;
        continue;
      }
      if (skip) continue;
      if (!BLOCK.has(tag) && !INLINE.has(tag) && !VOID.has(tag)) continue;
      const node: Extract<HtmlNode, { kind: "el" }> = {
        kind: "el",
        tag,
        attrs: readAttrs(match[3] || ""),
        children: [],
      };
      stack[stack.length - 1].children.push(node);
      if (!self) stack.push(node);
      continue;
    }
    if (match[5] && !skip) {
      const text = decode(match[5]);
      if (text) stack[stack.length - 1].children.push({ kind: "text", text });
    }
  }
  return root.children;
}

export function safeHttpUrl(value: string) {
  const url = value.trim();
  if (/^https?:\/\//i.test(url) && !/[\s<>]/.test(url)) return url;
  return "";
}
