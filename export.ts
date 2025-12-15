import { addFiles, readTermsFromFile } from "./dics/shared.ts";
import { Dictionary, DictionaryIndex } from "yomichan-dict-builder";
import { processGuifan } from "./dics/guifan/guifan.ts";
import { processHanyu7 } from "./dics/hanyu7/hanyu7.ts";

const versions = {
  guifan: "2025/12/15.8",
  hanyu7: "2025/12/15.8",
};

const guifanPinyinDic = new Dictionary({ fileName: "guifan-pinyin.zip" });
const guifanZhuyinDic = new Dictionary({ fileName: "guifan-zhuyin.zip" });
const guifanPinyinIndex = new DictionaryIndex()
  .setTitle("现代汉语规范词典 拼音")
  .setRevision(versions.guifan)
  .setAuthor("shadow")
  .setAttribution("外语教学与研究出版社 (2010)")
  .setDescription("A monolingual dictionary of Simplified Mandarin Chinese.")
  .setIsUpdatable(true)
  .setIndexUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/index-guifan-pinyin.json"
  )
  .setDownloadUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/guifan-pinyin.zip"
  );

guifanPinyinIndex.index.sourceLanguage = "zh";
guifanPinyinIndex.index.targetLanguage = "zh";
const guifanZhuyinIndex = new DictionaryIndex()
  .setTitle("现代汉语规范词典 注音")
  .setRevision(versions.guifan)
  .setAuthor("shadow")
  .setAttribution("外语教学与研究出版社 (2010)")
  .setDescription("A monolingual dictionary of Simplified Mandarin Chinese.")
  .setIsUpdatable(true)
  .setIndexUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/index-guifan-zhuyin.json"
  )
  .setDownloadUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/guifan-zhuyin.zip"
  );
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

const hanyu7PinyinDic = new Dictionary({ fileName: "hanyu7-pinyin.zip" });
const hanyu7ZhuyinDic = new Dictionary({ fileName: "hanyu7-zhuyin.zip" });
const hanyu7PinyinIndex = new DictionaryIndex()
  .setTitle("现代汉语词典 拼音")
  .setRevision(versions.hanyu7)
  .setAuthor("shadow")
  .setAttribution("外语教学与研究出版社 (2016)")
  .setDescription("A monolingual dictionary of Simplified Mandarin Chinese.")
  .setIsUpdatable(true)
  .setIndexUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/index-hanyu7-pinyin.json"
  )
  .setDownloadUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/hanyu7-pinyin.zip"
  );
hanyu7PinyinIndex.index.sourceLanguage = "zh";
hanyu7PinyinIndex.index.targetLanguage = "zh";
const hanyu7ZhuyinIndex = new DictionaryIndex()
  .setTitle("现代汉语词典 注音")
  .setRevision(versions.hanyu7)
  .setAuthor("shadow")
  .setAttribution("外语教学与研究出版社 (2016)")
  .setDescription("A monolingual dictionary of Simplified Mandarin Chinese.")
  .setIsUpdatable(true)
  .setIndexUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/index-hanyu7-zhuyin.json"
  )
  .setDownloadUrl(
    "https://github.com/username-011/mdx-yomitan/releases/latest/download/hanyu7-zhuyin.zip"
  );
hanyu7ZhuyinIndex.index.sourceLanguage = "zh";
hanyu7ZhuyinIndex.index.targetLanguage = "zh";
await hanyu7PinyinDic.setIndex(
  hanyu7PinyinIndex.build(),
  "build",
  "index-hanyu7-pinyin.json"
);
await hanyu7ZhuyinDic.setIndex(
  hanyu7ZhuyinIndex.build(),
  "build",
  "index-hanyu7-zhuyin.json"
);

await processGuifan(
  readTermsFromFile(
    `data/mdx-guifan-2/mdx/【现代汉语规范词典(第2版)】.mdx.txt`
  ),
  [guifanPinyinDic, guifanZhuyinDic]
);
await addFiles([hanyu7PinyinDic, hanyu7ZhuyinDic], "data/mdx-7/mdd");
await processHanyu7(readTermsFromFile(`data/mdx-7/mdx/现汉7.mdx.txt`), [
  hanyu7PinyinDic,
  hanyu7ZhuyinDic,
]);

for (const f of [guifanPinyinDic, guifanZhuyinDic]) {
  await f.addFile("./styles-guifan.css", "styles.css");
}
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
