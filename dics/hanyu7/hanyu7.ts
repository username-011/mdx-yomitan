import { TermEntry, type Dictionary } from "yomichan-dict-builder";
import type { ParsedTerm } from "../shared";
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
  onReading: (s: string) => StructuredContentNode
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
          .map((_, el) => traverse($, el, term, onReading))
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
          const getSimp = (content: StructuredContentNode) =>
            ({
              tag: "span",
              content: content,
              data: { hanyu7: "simp" },
            } satisfies StructuredContentNode);
          const getTrad = (content: StructuredContentNode) =>
            ({
              tag: "span",
              content: content,
              lang: "zh-TW",
              data: { hanyu7: "trad" },
            } satisfies StructuredContentNode);
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
  [pinyinDic, zhuyinDic]: [Dictionary, Dictionary]
) {
  let i = 0;
  for (const term of terms) {
    const $ = load(term.xmlString);
    for (const entryEl of $("entry").toArray()) {
      let reading = "";
      const entryContents = $(entryEl)
        .contents()
        .toArray()
        .map((el) =>
          traverse($, el, term.headword, (r) => {
            if (!reading) {
              reading = r;
              return "";
            }
            return [
              {
                tag: "span",
                content: r,
                data: { hanyu7: "pinyin" },
              },
              {
                tag: "span",
                content: p2z(r.replaceAll("·", " ")).replaceAll(" ", ""),
                data: { hanyu7: "zhuyin" },
              },
            ] satisfies StructuredContentNode;
          })
        )
        .filter((n) => n !== "") as StructuredContentNode[];
      reading = reading.replaceAll("·", " ");
      const weirdReadingMatch = reading.match(
        /(?<normal>.*?)（(?<altReading>.+?)）/
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
        entryContents.splice(1, 0, `(${youSplit.slice(1).join("又")})`);
      }
      const definitionContentsForReading = {
        tag: "span",
        content: entryContents,
        data: { hanyu7: "definitions-parent" },
        lang: "zh-CN",
      } satisfies StructuredContentNode;
      const pinyinTermEntry = new TermEntry(term.headword)
        .setReading(reading)
        .addDetailedDefinition({
          type: "structured-content",
          content: definitionContentsForReading,
        });
      const zhuyinTermEntry = new TermEntry(term.headword)
        .setReading(p2z(reading.replace(/-|\/\//g, " ")).replaceAll(" ", ""))
        .addDetailedDefinition({
          type: "structured-content",
          content: definitionContentsForReading,
        });
      await Promise.all([
        pinyinDic.addTerm(pinyinTermEntry.build()),
        zhuyinDic.addTerm(zhuyinTermEntry.build()),
      ]);
    }
    if (++i % 10000 === 0) {
      console.log(`Processed ${i} terms.`);
    }
  }
}
