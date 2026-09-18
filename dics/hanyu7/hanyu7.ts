import { type Dictionary } from "yomichan-dict-builder";
import { addRows, splitVariantForms, type ParsedTerm } from "../shared.ts";
import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { StructuredContentNode } from "yomichan-dict-builder/dist/types/yomitan/termbank";
import { ElementType } from "domelementtype";
import { p2z } from "pinyin-to-zhuyin";

type TableElements = "table" | "tbody" | "thead" | "tfoot" | "tr" | "td" | "th";

function traverse(
  $: CheerioAPI,
  node: AnyNode,
  term: string,
  onReading: (s: string) => StructuredContentNode,
  onTraditional: (s: string) => void,
): StructuredContentNode {
  switch (node.type) {
    case ElementType.Text:
      return node.data.trim().replaceAll("～", term);
    case ElementType.Tag:
      const cheerioEl = $(node);
      const contents = cheerioEl.contents();
      const def = {
        tag: "span" as "span" | TableElements,
        content: contents
          .map((_, el) => traverse($, el, term, onReading, onTraditional))
          .toArray()
          .filter((c) => c !== ""),
        data: {
          hanyu7: node.tagName ?? "no-tag",
          ...node.attribs,
        } as Record<string, string>,
      } satisfies StructuredContentNode;
      switch (node.tagName) {
        case "pinyin":
          return onReading(cheerioEl.text());
        case "table":
        case "tbody":
        case "thead":
        case "tfoot":
        case "tr":
        case "td":
        case "th": {
          def.tag = node.tagName;
          if (["td", "th"].includes(def.tag)) {
            const rowspan = Number(node.attribs["rowspan"]);
            const colspan = Number(node.attribs["colspan"]);
            // don't care for types
            (def as any).rowSpan = isNaN(rowspan) ? undefined : rowspan;
            (def as any).colSpan = isNaN(colspan) ? undefined : colspan;
          }
          return def;
        }
        case "a":
          const urlParams = new URLSearchParams({
            query: cheerioEl.text(),
            wildcards: "off",
          }).toString();
          return {
            tag: "a",
            href: `?${urlParams}`,
            content: def.content,
          };
        case "hw":
          // every traditional/variant form in the parentheses, markers included ("輝、*煇"),
          // becomes an extra lookup row; the display logic below stays as it was
          const hwParen = cheerioEl.text().match(/（(.+?)）/)?.at(1);
          if (hwParen) onTraditional(hwParen);
          const getSimp = (content: StructuredContentNode) =>
            ({
              tag: "span",
              content: content,
              data: { hanyu7: "simp" },
            }) satisfies StructuredContentNode;
          const getTrad = (content: StructuredContentNode) =>
            ({
              tag: "span",
              content: content,
              lang: "zh-TW",
              data: { hanyu7: "trad" },
            }) satisfies StructuredContentNode;
          const lastEl = def.content.at(-1);
          if (def.content.length > 1 && lastEl && !(lastEl as any).tag) {
            const s = lastEl as string;
            let tradTerm = s.match(/（(.+?)）/)?.at(1);
            if (tradTerm) {
              def.content.pop();
              def.content = [
                getSimp(def.content),
                getTrad(tradTerm),
              ] as StructuredContentNode[];
            }
          } else {
            let multipleTermsMatch = (
              def.content.at(0) as string | undefined
            )?.match(/(.*?)（(.+?)）/);
            if (multipleTermsMatch) {
              const [_, simpText, tradText] = multipleTermsMatch;
              def.content = [getSimp(simpText!), getTrad(tradText!)];
            } else {
              def.content = [getSimp(def.content)];
            }
          }
          return def;
        case "img":
          return {
            tag: "details",
            style: { cursor: "pointer" },
            content: [
              { tag: "summary", content: `图片` },
              {
                tag: "img",
                path: `img/${node.attribs["src"]}`,
                collapsed: false,
                collapsible: false,
                background: false,
              },
            ],
          };
        case "br":
          return "\n";
        default:
          return def;
      }
    case ElementType.Script:
      return "";
    default:
      throw new Error(`what is this? node type: ${node.type}`);
  }
}

export async function processHanyu7(
  terms: ParsedTerm[],
  [pinyinDic, zhuyinDic]: [Dictionary, Dictionary],
) {
  let i = 0;
  // One sequence number per <entry> (a reading of a headword), shared by the simplified and
  // traditional rows and by both editions.
  let sequence = 0;
  for (const term of terms) {
    const $ = load(term.xmlString);
    for (const entryEl of $("entry").toArray()) {
      let reading = "";
      const traditionalForms: string[] = [];
      const entryContents = $(entryEl)
        .contents()
        .toArray()
        .map((el) =>
          traverse(
            $,
            el,
            term.headword,
            (r) => {
              r = r.replace(/[-·’]|\/\//g, " ");
              if (!reading) {
                reading = r;
                return "";
              }
              // Both systems are always present in the content (identical in both editions);
              // each edition hides the other one through styles.css using `readingTag` (rendered as `data-sc-reading-tag`).
              return [
                {
                  tag: "span",
                  content: r,
                  data: { hanyu7: "pinyin", readingTag: "pinyin" },
                },
                {
                  tag: "span",
                  content: p2z(r).replaceAll(" ", ""),
                  data: { hanyu7: "zhuyin", readingTag: "zhuyin" },
                },
              ] satisfies StructuredContentNode;
            },
            (t) => traditionalForms.push(t),
          ),
        )
        .filter((n) => n !== "") as StructuredContentNode[];
      const weirdReadingMatch = reading.match(
        /(?<normal>.*?)（(?<altReading>.+?)）/,
      );
      if (weirdReadingMatch) {
        const [r1, r2] = [
          weirdReadingMatch.groups!.normal!,
          weirdReadingMatch.groups!.altReading!,
        ];
        reading = r1;
        entryContents.splice(1, 0, `(${r2})`);
      }
      const youSplit = reading.split("又");
      if (youSplit.length > 1) {
        reading = youSplit[0]!;
        entryContents.splice(1, 0, `(又 ${youSplit[1]!})`);
      }
      const definitionContentsForReading = {
        tag: "span",
        content: entryContents,
        data: { hanyu7: "definitions-parent" },
        lang: "zh-CN",
      } satisfies StructuredContentNode;
      const definition = {
        type: "structured-content" as const,
        content: definitionContentsForReading,
      };
      const entrySequence = ++sequence;
      await addRows(
        [pinyinDic, zhuyinDic],
        term.headword,
        reading,
        definition,
        entrySequence,
      );
      // the traditional form(s) get their own rows, tied to the same entry by the sequence
      for (const tradForm of splitVariantForms(
        traditionalForms.join("、"),
        term.headword,
      )) {
        await addRows(
          [pinyinDic, zhuyinDic],
          tradForm,
          reading,
          definition,
          entrySequence,
        );
      }
    }
    if (++i % 10000 === 0) {
      console.log(`Processed ${i} terms.`);
    }
  }
}
