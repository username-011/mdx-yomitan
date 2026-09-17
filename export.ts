import { addFiles, readTermsFromFile } from "./dics/shared.ts";
import { Dictionary, DictionaryIndex } from "yomichan-dict-builder";
import { processGuifan } from "./dics/guifan/guifan.ts";
import { processHanyu7 } from "./dics/hanyu7/hanyu7.ts";
import { mergeCssFiles } from "./utils/css.ts";

// JSZip re-encodes string inputs to UTF-8 in 16 KiB chunks, so a surrogate pair (an astral CJK
// character) that straddles a chunk boundary turns into two U+FFFD characters. Hand it bytes.
(Dictionary.prototype as any).saveJsonToZip = async function (
  fileName: string,
  data: unknown,
) {
  this.zip.file(fileName, Buffer.from(JSON.stringify(data), "utf8"));
};


const versions = {
  guifan: "2026/02/12.1",
  hanyu7: "2026/02/09.1",
};

const guifanPinyinDic = new Dictionary({ fileName: "guifan-pinyin.zip" });
const guifanZhuyinDic = new Dictionary({ fileName: "guifan-zhuyin.zip" });
const guifanPinyinIndex = new DictionaryIndex()
  .setTitle("现代汉语规范词典 拼音")
  .setRevision(versions.guifan)
  .setAuthor("shadow")
  .setSequenced(true)
  .setAttribution("外语教学与研究出版社 (2010)")
  .setDescription("A monolingual dictionary of Simplified Mandarin Chinese.")
  .setIsUpdatable(true)
  .setIndexUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/index-guifan-pinyin.json",
  )
  .setDownloadUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/guifan-pinyin.zip",
  );

guifanPinyinIndex.index.sourceLanguage = "zh";
guifanPinyinIndex.index.targetLanguage = "zh";
const guifanZhuyinIndex = new DictionaryIndex()
  .setTitle("现代汉语规范词典 注音")
  .setRevision(versions.guifan)
  .setAuthor("shadow")
  .setSequenced(true)
  .setAttribution("外语教学与研究出版社 (2010)")
  .setDescription("A monolingual dictionary of Simplified Mandarin Chinese.")
  .setIsUpdatable(true)
  .setIndexUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/index-guifan-zhuyin.json",
  )
  .setDownloadUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/guifan-zhuyin.zip",
  );
guifanZhuyinIndex.index.sourceLanguage = "zh";
guifanZhuyinIndex.index.targetLanguage = "zh";
await guifanPinyinDic.setIndex(
  guifanPinyinIndex.build(),
  "build",
  "index-guifan-pinyin.json",
);
await guifanZhuyinDic.setIndex(
  guifanZhuyinIndex.build(),
  "build",
  "index-guifan-zhuyin.json",
);

const hanyu7PinyinDic = new Dictionary({ fileName: "hanyu7-pinyin.zip" });
const hanyu7ZhuyinDic = new Dictionary({ fileName: "hanyu7-zhuyin.zip" });
const hanyu7PinyinIndex = new DictionaryIndex()
  .setTitle("现代汉语词典 拼音")
  .setRevision(versions.hanyu7)
  .setAuthor("shadow")
  .setSequenced(true)
  .setAttribution("外语教学与研究出版社 (2016)")
  .setDescription("A monolingual dictionary of Simplified Mandarin Chinese.")
  .setIsUpdatable(true)
  .setIndexUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/index-hanyu7-pinyin.json",
  )
  .setDownloadUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/hanyu7-pinyin.zip",
  );
hanyu7PinyinIndex.index.sourceLanguage = "zh";
hanyu7PinyinIndex.index.targetLanguage = "zh";
const hanyu7ZhuyinIndex = new DictionaryIndex()
  .setTitle("现代汉语词典 注音")
  .setRevision(versions.hanyu7)
  .setAuthor("shadow")
  .setSequenced(true)
  .setAttribution("外语教学与研究出版社 (2016)")
  .setDescription("A monolingual dictionary of Simplified Mandarin Chinese.")
  .setIsUpdatable(true)
  .setIndexUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/index-hanyu7-zhuyin.json",
  )
  .setDownloadUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/hanyu7-zhuyin.zip",
  );
hanyu7ZhuyinIndex.index.sourceLanguage = "zh";
hanyu7ZhuyinIndex.index.targetLanguage = "zh";
await hanyu7PinyinDic.setIndex(
  hanyu7PinyinIndex.build(),
  "build",
  "index-hanyu7-pinyin.json",
);
await hanyu7ZhuyinDic.setIndex(
  hanyu7ZhuyinIndex.build(),
  "build",
  "index-hanyu7-zhuyin.json",
);

await processGuifan(
  readTermsFromFile(
    `data/mdx-guifan-2/mdx/【现代汉语规范词典(第2版)】.mdx.txt`,
  ),
  [guifanPinyinDic, guifanZhuyinDic],
);
await addFiles([hanyu7PinyinDic, hanyu7ZhuyinDic], "data/mdx-7/mdd");
await processHanyu7(readTermsFromFile(`data/mdx-7/mdx/现汉7.mdx.txt`), [
  hanyu7PinyinDic,
  hanyu7ZhuyinDic,
]);

mergeCssFiles(
  ["styles-guifan.css", "styles-guifan-pinyin-diff.css"],
  "styles-guifan-pinyin.css",
);
mergeCssFiles(
  ["styles-guifan.css", "styles-guifan-zhuyin-diff.css"],
  "styles-guifan-zhuyin.css",
);
mergeCssFiles(
  ["styles-hanyu7.css", "styles-hanyu7-pinyin-diff.css"],
  "styles-hanyu7-pinyin.css",
);
mergeCssFiles(
  ["styles-hanyu7.css", "styles-hanyu7-zhuyin-diff.css"],
  "styles-hanyu7-zhuyin.css",
);

await Promise.all([
  guifanPinyinDic.addFile("./styles-guifan-pinyin.css", "styles.css"),
  guifanZhuyinDic.addFile("./styles-guifan-zhuyin.css", "styles.css"),
]);
await Promise.all([
  hanyu7PinyinDic.addFile("./styles-hanyu7-pinyin.css", "styles.css"),
  hanyu7ZhuyinDic.addFile("./styles-hanyu7-zhuyin.css", "styles.css"),
]);

await guifanPinyinDic.export("build");
console.log("Exported 现代汉语规范词典 拼音");
await guifanZhuyinDic.export("build");
console.log("Exported 现代汉语规范词典 注音");
await hanyu7PinyinDic.export("build");
console.log("Exported 现代汉语词典 拼音");
await hanyu7ZhuyinDic.export("build");
console.log("Exported 现代汉语词典 注音");
