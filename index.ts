import { readTermsFromFile } from "./dics/shared";
import { Dictionary, DictionaryIndex } from "yomichan-dict-builder";
import { processGuifan } from "./dics/guifan/guifan";

const versions = {
  guifan: "0.01",
};

const guifanPinyinDic = new Dictionary({ fileName: "guifan-pinyin.zip" });
const guifanZhuyinDic = new Dictionary({ fileName: "guifan-zhuyin.zip" });
const guifanPinyinIndex = new DictionaryIndex()
  .setTitle("现代汉语规范词典 拼音")
  .setRevision(versions.guifan)
  .setAuthor("shadow")
  .setAttribution("外语教学与研究出版社 (2010)")
  .setDescription("A monolingual dictionary of Mandarin Chinese.");
guifanPinyinIndex.index.sourceLanguage = "zh";
guifanPinyinIndex.index.targetLanguage = "zh";
const guifanZhuyinIndex = new DictionaryIndex()
  .setTitle("现代汉语规范词典 注音")
  .setRevision(versions.guifan)
  .setAuthor("shadow")
  .setAttribution("外语教学与研究出版社 (2010)")
  .setDescription("A monolingual dictionary of Mandarin Chinese.");
guifanZhuyinIndex.index.sourceLanguage = "zh";
guifanZhuyinIndex.index.targetLanguage = "zh";
await guifanPinyinDic.setIndex(
  guifanPinyinIndex.build(),
  "build",
  "index-guifan-pinyin.json"
);
await guifanZhuyinDic.setIndex(
  guifanZhuyinIndex.build(),
  "build",
  "index-guifan-zhuyin.json"
);

await processGuifan(
  readTermsFromFile(`data/mdx-guifan-2/【现代汉语规范词典(第2版)】.mdx.txt`),
  [guifanPinyinDic, guifanZhuyinDic]
);

[guifanPinyinDic, guifanZhuyinDic].forEach((f) =>
  f.addFile("./styles.css", "styles.css")
);

await guifanPinyinDic.export("build");
console.log("Exported 现代汉语规范词典 拼音");
await guifanZhuyinDic.export("build");
console.log("Exported 现代汉语规范词典 注音");
