import { type ReactNode } from "react";
import { Image, Linking, Text, View, type StyleProp, type TextStyle } from "react-native";
import { htmlToPlain, looksRich, parseHtml, safeHttpUrl, type HtmlNode } from "@/lib/html";
import { colors, fonts } from "@/theme";

const body: TextStyle = {
  color: colors.ink,
  fontFamily: fonts.body,
  fontSize: 16,
  lineHeight: 24,
};

function alignOf(attrs: Record<string, string>) {
  const fromClass = attrs.class?.match(/ql-align-(center|right|justify)/i);
  if (fromClass) return fromClass[1].toLowerCase() as TextStyle["textAlign"];
  const fromStyle = attrs.style?.match(/text-align\s*:\s*(left|center|right|justify)/i);
  return fromStyle ? fromStyle[1].toLowerCase() as TextStyle["textAlign"] : undefined;
}

function colorOf(attrs: Record<string, string>) {
  const match = attrs.style?.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))/i);
  if (!match || /url\(|expression|javascript/i.test(match[1])) return undefined;
  return match[1];
}

function inlineStyle(node: Extract<HtmlNode, { kind: "el" }>, base: TextStyle): TextStyle {
  const next: TextStyle = { ...base };
  if (node.tag === "strong" || node.tag === "b") next.fontFamily = fonts.display;
  if (node.tag === "em" || node.tag === "i") next.fontStyle = "italic";
  if (node.tag === "u") next.textDecorationLine = "underline";
  if (node.tag === "s" || node.tag === "strike") next.textDecorationLine = "line-through";
  const color = colorOf(node.attrs);
  if (color) next.color = color;
  return next;
}

function renderInline(nodes: HtmlNode[], base: TextStyle) {
  return nodes.map((node, index) => {
    if (node.kind === "text") return node.text;
    if (node.tag === "br") return "\n";
    if (node.tag === "img") return null;
    const next = inlineStyle(node, base);
    if (node.tag === "a") {
      const href = safeHttpUrl(node.attrs.href || "");
      return (
        <Text
          key={index}
          style={[next, { color: colors.gold, textDecorationLine: "underline" }]}
          onPress={href ? () => { Linking.openURL(href).catch(() => undefined); } : undefined}
        >
          {renderInline(node.children, next)}
        </Text>
      );
    }
    return (
      <Text key={index} style={next}>
        {renderInline(node.children, next)}
      </Text>
    );
  });
}

function isEmpty(node: Extract<HtmlNode, { kind: "el" }>) {
  return node.children.every((child) => {
    if (child.kind === "text") return !child.text.trim();
    return child.tag === "br";
  });
}

function renderBlocks(nodes: HtmlNode[], base: TextStyle) {
  const blocks: ReactNode[] = [];
  let inline: HtmlNode[] = [];
  function flush() {
    if (!inline.some((node) => node.kind === "text" ? node.text.trim() : node.tag !== "br")) {
      inline = [];
      return;
    }
    blocks.push(
      <Text key={`t-${blocks.length}`} style={base}>
        {renderInline(inline, base)}
      </Text>,
    );
    inline = [];
  }
  nodes.forEach((node) => {
    if (node.kind === "text" || (node.kind === "el" && node.tag !== "img" && !["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "pre"].includes(node.tag))) {
      inline.push(node);
      return;
    }
    flush();
    if (node.kind === "el") blocks.push(renderBlock(node, base, blocks.length));
  });
  flush();
  return blocks;
}

function renderBlock(node: Extract<HtmlNode, { kind: "el" }>, base: TextStyle, key: number) {
  if (node.tag === "img") {
    const src = safeHttpUrl(node.attrs.src || "");
    if (!src) return null;
    return (
      <Image
        key={key}
        source={{ uri: src }}
        accessibilityLabel={node.attrs.alt || "Image"}
        style={{ width: "100%", height: 200, borderRadius: 12, backgroundColor: colors.line }}
      />
    );
  }
  if (node.tag === "ul" || node.tag === "ol") {
    const items = node.children.filter((child): child is Extract<HtmlNode, { kind: "el" }> => child.kind === "el" && child.tag === "li");
    return (
      <View key={key} style={{ gap: 6 }}>
        {items.map((item, index) => {
          const marker = item.attrs["data-list"] === "bullet" || node.tag === "ul" && item.attrs["data-list"] !== "ordered" ? "•" : `${index + 1}.`;
          const indent = Number(item.attrs.class?.match(/ql-indent-(\d+)/)?.[1] || 0);
          return (
            <View key={index} style={{ flexDirection: "row", gap: 8, marginLeft: indent * 16 }}>
              <Text style={base}>{marker}</Text>
              <View style={{ flex: 1 }}>{renderBlocks(item.children, base)}</View>
            </View>
          );
        })}
      </View>
    );
  }
  if (isEmpty(node)) return <View key={key} style={{ height: 6 }} />;
  const heading = /^h[1-6]$/.test(node.tag);
  const style: TextStyle = {
    ...base,
    textAlign: alignOf(node.attrs),
    ...(heading
      ? { fontFamily: fonts.display, fontSize: node.tag === "h1" ? 22 : node.tag === "h2" ? 20 : 18, fontWeight: "600" as const }
      : null),
  };
  const content = renderBlocks(node.children, style);
  if (node.tag === "blockquote") {
    return (
      <View key={key} style={{ borderLeftWidth: 3, borderLeftColor: colors.gold, paddingLeft: 12 }}>
        {content}
      </View>
    );
  }
  if (node.tag === "pre") {
    return (
      <View key={key} style={{ backgroundColor: "rgba(15, 23, 42, 0.05)", borderRadius: 12, padding: 12 }}>
        {content}
      </View>
    );
  }
  return <View key={key}>{content}</View>;
}

export function HtmlBody({
  html,
  lines,
  style,
}: {
  html: string
  lines?: number
  style?: StyleProp<TextStyle>
}) {
  const text = htmlToPlain(html);
  if (!text && !/<img\b/i.test(html)) return null;
  if (lines || !looksRich(html)) {
    return (
      <Text numberOfLines={lines} style={[body, style]}>
        {lines ? text.replace(/\s+/g, " ") : text}
      </Text>
    );
  }
  return <View style={{ gap: 8 }}>{renderBlocks(parseHtml(html), body)}</View>;
}
