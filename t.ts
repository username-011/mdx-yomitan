import { findSyllableBoundaries } from "pinyin-tone-tool";

const word = "qiènuò";
const out = findSyllableBoundaries(word);
console.log(`word: ${word}`);
console.log(
  "split",
  out.map((a) => word.slice(a.start, a.end))
);
