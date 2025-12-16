import { p2z } from "pinyin-to-zhuyin";
import { findSyllableBoundaries } from "pinyin-tone-tool";

const word = "qiērù";
const out = findSyllableBoundaries(word);
console.log(`word: ${word}`);
console.log(
  "split",
  out.map((a) => word.slice(a.start, a.end))
);
console.log(p2z(word));
