import { readdirSync, readFileSync } from "fs";
import { splitOnFirst } from "../utils.ts";
import { TermEntry, type Dictionary } from "yomichan-dict-builder";
import type { DetailedDefinition } from "yomichan-dict-builder/dist/types/yomitan/termbank";
import { p2z } from "pinyin-to-zhuyin";

export type ParsedTerm = {
  headword: string;
  xmlString: string;
};

export function readTermsFromFile(termsTextFile: string): ParsedTerm[] {
  const content = readFileSync(termsTextFile, "utf-8");
  return Array.from(
    content.matchAll(/.+?(?=<\/>)/gs).map((m) =>
      m[0]
        .replace("</>", "")
        // .replace(/<script.*?>.*?<\/script>/g, "")
        // .replace(/<link.*?rel=\"stylesheet\".*?>/g, "")
        // .replace("<hr>", "")
        .trim()
    )
  ).map((termMatch) => {
    const [headword, xmlString] = splitOnFirst(termMatch, "\n").map((l) =>
      l.trim()
    );
    if (!headword || !xmlString) {
      throw new Error(`Failed to parse term:\n${termMatch}`);
    }
    return {
      headword,
      xmlString,
    };
  });
}

export async function addFiles(
  [pinyinDic, zhuyinDic]: [Dictionary, Dictionary],
  picsFolder: string
) {
  readdirSync(picsFolder).forEach((file) => {
    if (!file.toLowerCase().endsWith(".png")) return;
    const filePath = `${picsFolder}/${file}`;
    pinyinDic.addFile(filePath, `img/${file}`);
    zhuyinDic.addFile(filePath, `img/${file}`);
  });
}

/**
 * Splits a parenthesised list of variant forms ("讀", "輝、⁎煇") into clean headwords, dropping
 * variant-type markers (*, ＊, ⁎, ⁑, ※, △, circled numbers), whitespace, and anything that still
 * looks like markup.
 */
export function splitVariantForms(text: string, headword: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[、，,/／]/)) {
    const form = raw.replace(/[\s*＊⁎⁑※△①-⑳㉑-㉟]/g, "").trim();
    if (
      form.length > 0 &&
      form !== headword &&
      !/[（）()<>]/.test(form) &&
      !out.includes(form)
    )
      out.push(form);
  }
  return out;
}

export function toZhuyin(pinyinReading: string): string {
  return p2z(pinyinReading).replaceAll(" ", "");
}

/**
 * Adds one row to each edition for `term`: pinyin reading in the pinyin edition, the derived
 * zhuyin reading in the zhuyin edition, the same definition and sequence number in both.
 * Rows sharing a sequence number (traditional/simplified forms, both editions) describe the same
 * entry, which is what lets consumers group them back together.
 */
export async function addRows(
  [pinyinDic, zhuyinDic]: [Dictionary, Dictionary],
  term: string,
  pinyinReading: string,
  definition: DetailedDefinition,
  sequence: number
) {
  await Promise.all([
    pinyinDic.addTerm(
      new TermEntry(term)
        .setReading(pinyinReading)
        .setSequenceNumber(sequence)
        .addDetailedDefinition(definition)
        .build()
    ),
    zhuyinDic.addTerm(
      new TermEntry(term)
        .setReading(toZhuyin(pinyinReading))
        .setSequenceNumber(sequence)
        .addDetailedDefinition(definition)
        .build()
    ),
  ]);
}
