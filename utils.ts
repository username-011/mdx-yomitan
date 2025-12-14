import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

export function splitOnFirst(str: string, del: string) {
  const s = str.split(del);
  if (s.length < 2) return [str];
  return [s[0]!, s.slice(1).join(del)];
}

export function splitByElement(
  $: cheerio.CheerioAPI,
  parent: cheerio.Cheerio<Element>,
  selector: string
): AnyNode[][] {
  const sections: AnyNode[][] = [];
  let currentSection: AnyNode[] = [];
  parent.contents().each(function () {
    const $child = $(this);
    if ($child.is(selector)) {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
    } else currentSection.push(this);
  });
  if (currentSection.length > 0) sections.push(currentSection);
  return sections;
}

export function filterUntil<T>(arr: T[], condition: (el: T) => boolean): T[] {
  const newArr = [] as T[];
  for (const el of arr) {
    if (condition(el)) return newArr;
    newArr.push(el);
  }
  return newArr;
}
