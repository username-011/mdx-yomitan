import { TermEntry, type Dictionary } from "yomichan-dict-builder";
import { filterUntil, splitByElement } from "../../utils.ts";
import type { ParsedTerm } from "../shared.ts";
import * as cheerio from "cheerio";
import type {
  DetailedDefinition,
  StructuredContentNode,
} from "yomichan-dict-builder/dist/types/yomitan/termbank";
import { ElementType } from "domelementtype";
import type { AnyNode, Element, Text } from "domhandler";
import { p2z } from "pinyin-to-zhuyin";
import { mkdirSync, writeFileSync } from "fs";
import { createHash } from "crypto";

async function addImage(b64: string, dic: Dictionary, name: string) {
  b64 = b64.replace(/^data:\w+\/\w+;base64,/g, "");
  mkdirSync("data/mdx-guifan-2/img", { recursive: true });
  writeFileSync(
    `data/mdx-guifan-2/img/${name}.png`,
    Buffer.from(b64, "base64"),
  );
  await dic.addFile(`data/mdx-guifan-2/img/${name}.png`, `img/${name}.png`);
}

async function traverse(
  $: cheerio.CheerioAPI,
  node: AnyNode,
  dics: Dictionary[],
): Promise<StructuredContentNode> {
  switch (node.type) {
    case ElementType.Text:
      return node.data.trim();
    case ElementType.Tag:
      const cheerioEl = $(node);
      const contents = await Promise.all(
        cheerioEl
          .contents()
          .map((_, el) => traverse($, el, dics))
          .toArray(),
      );
      const def = {
        tag: "span",
        content: contents.filter((c) => c !== ""),
        data: {
          guifan: node.tagName ?? "no-tag",
          class: node.attribs["class"],
        } as Record<string, string>,
      } satisfies StructuredContentNode;
      switch (node.tagName) {
        case "x-hw":
        case "x-hws":
          def.data.guifan = "simp";
          return def;
        // ignore
        case "x-pr":
        case "script":
          return "";
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
        case "img": {
          const src = node.attribs["src"];
          if (!src) return "";
          const hash = createHash("sha256").update(src).digest("hex");
          await Promise.all(dics.map((dic) => addImage(src, dic, hash)));
          return {
            tag: "img",
            path: `img/${hash}.png`,
            collapsed: false,
            collapsible: false,
            height: 1.2,
            sizeUnits: "em",
          };
        }
        case "x-hwp":
          const next = node.next?.next;
          const res = ["←", def] as StructuredContentNode[];
          if (next?.type === ElementType.Tag && next.tagName === "x-pr") {
            const pReading = $(next).text();
            const zReading = p2z(pReading).replaceAll(" ", "");
            res.push({
              tag: "span",
              content: [
                {
                  tag: "span",
                  content: pReading,
                  data: { guifan: "reading-pinyin" },
                },
                {
                  tag: "span",
                  content: zReading,
                  data: { guifan: "reading-zhuyin" },
                },
              ],
              data: {
                guifan: next.tagName ?? "no-tag",
                class: next.attribs["class"],
              },
            } as StructuredContentNode);
          }
          return res;
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

// todo: add separate terms for non erhua variants where possible
// todo: actually add the base64 images where they rarely exist
export async function processGuifan(
  terms: ParsedTerm[],
  [pinyinDic, zhuyinDic]: [Dictionary, Dictionary],
) {
  let i = 0;
  const linkedToDb = {} as Record<string, DetailedDefinition>;
  const linkedQueue = {} as Record<string, string>;
  for (const term of terms /* .filter((t) => t.headword === "埃") */) {
    let linkMatch: RegExpMatchArray | null = null;
    if ((linkMatch = term.xmlString.match(/@@@LINK=(.+?)/))) {
      linkedQueue[term.headword] = linkMatch[1]!;
      continue;
    }
    const $ = cheerio.load(term.xmlString);
    for (let definitionSection of splitByElement($, $(".HYGF2"), "hr").map(
      (section) =>
        section.filter(
          (e) => !(e.type === ElementType.Text && $(e).text() === "\n"),
        ),
    )) {
      const readingNode = definitionSection.find(
        (d) => d.type === ElementType.Tag && d.tagName === "x-pr",
      );
      let reading = readingNode ? $(readingNode).text() : "";
      reading = reading.replace(/-|\/\//g, " ");
      const tradNode = filterUntil(
        definitionSection,
        (node) => node.type === ElementType.Tag && node.tagName === "dt",
      ).find(
        (d) =>
          d.type === ElementType.Text &&
          $(d)
            .text()
            .match(/（.+?）/g),
      );
      definitionSection = definitionSection.filter((e) => e !== tradNode);
      const definitionsMain = (
        await Promise.all(
          definitionSection.map((e) => traverse($, e, [pinyinDic, zhuyinDic])),
        )
      ).filter((n) => n !== "") as StructuredContentNode[];
      if (tradNode) {
        const bef = definitionsMain.shift();
        if (!bef) throw new Error("shouldn't happen 1");
        definitionsMain.unshift({
          tag: "span",
          content:
            $(tradNode)
              .text()
              .trim()
              .match(/（(.+?)）/)
              ?.at(1) ?? "",
          data: { guifan: "trad" },
          lang: "zh-TW",
        });
        definitionsMain.unshift(bef);
      }
      const definitionContentsForReading = {
        tag: "span",
        content: definitionsMain,
        data: { guifan: "definitions-parent" },
        lang: "zh-CN",
      } satisfies StructuredContentNode;
      const definition = {
        type: "structured-content",
        content: definitionContentsForReading,
      } satisfies DetailedDefinition;
      // I'm half asleep so this is what you get
      const linkedReading = definitionsMain.find(
        (e) =>
          typeof e === "object" &&
          (e as any).find?.((ee: any) => ee.data?.guifan === "x-hwp"),
      );
      if (linkedReading) linkedToDb[term.headword] = definition;
      const pinyinTermEntry = new TermEntry(term.headword)
        .setReading(reading)
        .addDetailedDefinition(definition)
        .setDefinitionTags("pinyin");
      const zhuyinTermEntry = new TermEntry(term.headword)
        .setReading(p2z(reading).replaceAll(" ", ""))
        .addDetailedDefinition(definition)
        .setDefinitionTags("zhuyin");
      await Promise.all([
        pinyinDic.addTerm(pinyinTermEntry.build()),
        zhuyinDic.addTerm(zhuyinTermEntry.build()),
      ]);
    }
    if (++i % 10000 === 0) {
      console.log(`Processed ${i} terms.`);
    }
  }

  let j = 0;
  for (const [fromLinked, toLinked] of Object.entries(linkedQueue)) {
    const toLinkedTermDefinition = linkedToDb[toLinked];
    if (!toLinkedTermDefinition) {
      // wtf is this bug. I don't care enough for these 2 words -_-
      // maybe someday in distant future I'll get to it
      console.log(
        `Linked term not found, toLinked: ${toLinked}, fromLinked: ${fromLinked}`,
      );
      continue;
    }
    let actualReading = "";
    // more unhinged code
    for (const e of (toLinkedTermDefinition as any).content.content) {
      const f = (e as any).find?.((ee: any) => ee.data?.guifan === "x-pr");
      if (f) {
        actualReading = f.content[1].content;
        break;
      }
    }
    const pinyinTerm = new TermEntry(fromLinked)
      .setReading(actualReading)
      .addDetailedDefinition(toLinkedTermDefinition);
    const zhuyinTerm = new TermEntry(fromLinked)
      .setReading(p2z(actualReading).replaceAll(" ", ""))
      .addDetailedDefinition(toLinkedTermDefinition);
    await Promise.all([
      pinyinDic.addTerm(pinyinTerm.build()),
      zhuyinDic.addTerm(zhuyinTerm.build()),
    ]);
    j++;
  }
  console.log(`Processed ${j} linked terms.`);
}
