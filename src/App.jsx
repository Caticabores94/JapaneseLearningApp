import { useEffect, useMemo, useRef, useState } from "react";
import { RADICALS, KANJI, READINGS, KANJI_RADICALS, VOCAB } from "./data/kanjiData.js";
import "./App.css";

const HOME_HERO_IMAGE = "/home-hero.png";

const SRS_STAGES = [
  "apprentice-1",
  "apprentice-2",
  "apprentice-3",
  "apprentice-4",
  "guru-1",
  "guru-2",
  "master",
  "enlightened",
  "burned",
];

const SRS_INTERVAL_HOURS = {
  "apprentice-1": 4,
  "apprentice-2": 8,
  "apprentice-3": 24,
  "apprentice-4": 48,
  "guru-1": 168,
  "guru-2": 336,
  "master": 720,
  "enlightened": 2880,
  "burned": 999999,
};

const STORAGE_PROGRESS = "kanji_progress";
const STORAGE_SCHEDULE = "kanji_schedule";
const LEVEL_SIZE = 30;
const FREE_KANJI_LEVEL_LIMIT = 2;
const FREE_KANA_LEVEL_LIMIT = 2;

function isCjk(ch) {
  return /[\u4e00-\u9fff]/.test(ch);
}

function isHiragana(ch) {
  return /[\u3040-\u309f]/.test(ch);
}

function classifyVocabUsage(word) {
  const chars = Array.from(word);
  const cjkCount = chars.filter(isCjk).length;
  const hasHira = chars.some(isHiragana);
  if (cjkCount >= 2) return "on";
  if (cjkCount === 1 && hasHira) return "kun";
  return "other";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function katakanaToHiragana(text) {
  return String(text || "").replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

const KANA_DIGRAPHS = {
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  ぎゃ: "gya",
  ぎゅ: "gyu",
  ぎょ: "gyo",
  しゃ: "sha",
  しゅ: "shu",
  しょ: "sho",
  じゃ: "ja",
  じゅ: "ju",
  じょ: "jo",
  ちゃ: "cha",
  ちゅ: "chu",
  ちょ: "cho",
  にゃ: "nya",
  にゅ: "nyu",
  にょ: "nyo",
  ひゃ: "hya",
  ひゅ: "hyu",
  ひょ: "hyo",
  びゃ: "bya",
  びゅ: "byu",
  びょ: "byo",
  ぴゃ: "pya",
  ぴゅ: "pyu",
  ぴょ: "pyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "rya",
  りゅ: "ryu",
  りょ: "ryo",
  ゔぁ: "va",
  ゔぃ: "vi",
  ゔぇ: "ve",
  ゔぉ: "vo",
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
  てぃ: "ti",
  とぅ: "tu",
  でぃ: "di",
  どぅ: "du",
};

const KANA_MONOGRAPHS = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  て: "te",
  と: "to",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  ゐ: "wi",
  ゑ: "we",
  を: "o",
  ん: "n",
  ゔ: "vu",
  ぁ: "a",
  ぃ: "i",
  ぅ: "u",
  ぇ: "e",
  ぉ: "o",
  ゃ: "ya",
  ゅ: "yu",
  ょ: "yo",
};

function hasKana(value) {
  return /[\u3040-\u30ff]/.test(String(value || ""));
}

function getLastVowel(value) {
  const m = String(value).match(/[aeiou](?!.*[aeiou])/);
  return m ? m[0] : "";
}

function kanaToRomaji(value) {
  const text = katakanaToHiragana(value);
  let out = "";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const pair = text.slice(i, i + 2);

    if (char === "っ") {
      const nextPair = KANA_DIGRAPHS[text.slice(i + 1, i + 3)];
      const nextSingle = KANA_MONOGRAPHS[text[i + 1]] || "";
      const nextRomaji = nextPair || nextSingle;
      if (nextRomaji) out += nextRomaji[0];
      continue;
    }

    if (char === "ー") {
      const vowel = getLastVowel(out);
      if (vowel) out += vowel;
      continue;
    }

    if (KANA_DIGRAPHS[pair]) {
      out += KANA_DIGRAPHS[pair];
      i += 1;
      continue;
    }

    out += KANA_MONOGRAPHS[char] || char;
  }

  return out;
}

function canonicalRomaji(value) {
  const raw = String(value || "").trim().toLowerCase();
  const asRomaji = hasKana(raw) ? kanaToRomaji(raw) : raw;
  return asRomaji
    .replace(/shi/g, "si")
    .replace(/chi/g, "ti")
    .replace(/tsu/g, "tu")
    .replace(/fu/g, "hu")
    .replace(/ji/g, "zi")
    .replace(/ja/g, "zya")
    .replace(/ju/g, "zyu")
    .replace(/jo/g, "zyo")
    .replace(/ou/g, "o")
    .replace(/oo/g, "o")
    .replace(/uu/g, "u")
    .replace(/[^a-z]/g, "");
}

function readingForms(value) {
  return String(value || "")
    .split(/[\/、,\s]+/g)
    .map((part) => canonicalRomaji(part))
    .filter(Boolean);
}

function readingLabelInRomaji(value) {
  const forms = Array.isArray(value) ? value.flatMap((entry) => readingForms(entry)) : readingForms(value);
  return forms.length ? forms.join(" / ") : "N/A";
}

function nowMs() {
  return Date.now();
}

function addHoursMs(hours) {
  return nowMs() + hours * 60 * 60 * 1000;
}

function stageIndex(stage) {
  return SRS_STAGES.indexOf(stage);
}

function advanceStage(stage) {
  const idx = stageIndex(stage);
  if (idx === -1) return "apprentice-1";
  if (idx >= SRS_STAGES.length - 1) return "burned";
  return SRS_STAGES[idx + 1];
}

function resetStage() {
  return "apprentice-1";
}

function isGuruOrAbove(stage) {
  const idx = stageIndex(stage);
  return idx >= stageIndex("guru-1");
}

function getProgressMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PROGRESS)) || {};
  } catch {
    return {};
  }
}

function saveProgressMap(map) {
  localStorage.setItem(STORAGE_PROGRESS, JSON.stringify(map));
}

function getScheduleMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SCHEDULE)) || {};
  } catch {
    return {};
  }
}

function saveScheduleMap(map) {
  localStorage.setItem(STORAGE_SCHEDULE, JSON.stringify(map));
}

function replaceLocalSnapshot(progressMap = {}, scheduleMap = {}) {
  saveProgressMap(progressMap);
  saveScheduleMap(scheduleMap);
}

function localSnapshot() {
  return {
    progressMap: getProgressMap(),
    scheduleMap: getScheduleMap(),
  };
}

function snapshotHasData(snapshot) {
  return Boolean(
    snapshot &&
      ((snapshot.progressMap && Object.keys(snapshot.progressMap).length) ||
        (snapshot.scheduleMap && Object.keys(snapshot.scheduleMap).length))
  );
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }
  return payload;
}

function progressKey(type, id) {
  return `${type}:${id}`;
}

function getProgress(type, id) {
  const map = getProgressMap();
  return map[progressKey(type, id)] || null;
}

function setProgress(type, id, stage, correctDelta, incorrectDelta) {
  const map = getProgressMap();
  const key = progressKey(type, id);
  const existing = map[key] || { correct: 0, incorrect: 0, stage: "apprentice-1" };
  map[key] = {
    stage,
    correct: existing.correct + correctDelta,
    incorrect: existing.incorrect + incorrectDelta,
  };
  saveProgressMap(map);
}

function setSchedule(type, id, nextReviewAtMs) {
  const map = getScheduleMap();
  map[progressKey(type, id)] = nextReviewAtMs;
  saveScheduleMap(map);
}

function isNew(type, id) {
  return !getProgress(type, id);
}

function getNextReviewAt(stage) {
  const hours = SRS_INTERVAL_HOURS[stage] || 24;
  return addHoursMs(hours);
}

function computeDifficulty(k) {
  const grade = k.grade ?? 99;
  const strokes = k.strokeCount ?? 99;
  const freq = k.frequency ?? 9999;
  return grade * 10000 + strokes * 100 + freq;
}

function hasFullAccess(user) {
  return user?.planType === "full" && user?.paymentStatus === "paid";
}

function isKanjiLevelUnlocked(levelNumber, user) {
  return hasFullAccess(user) || levelNumber <= FREE_KANJI_LEVEL_LIMIT;
}

function isKanaLevelUnlocked(levelNumber, user) {
  return hasFullAccess(user) || levelNumber <= FREE_KANA_LEVEL_LIMIT;
}

function buildLevels() {
  const ordered = [...KANJI].sort((a, b) => computeDifficulty(a) - computeDifficulty(b));
  const levels = [];
  for (let i = 0; i < ordered.length; i += LEVEL_SIZE) {
    levels.push({
      level: levels.length + 1,
      items: ordered.slice(i, i + LEVEL_SIZE),
    });
  }
  return levels;
}

const LEVELS = buildLevels();
const KANJI_LEVEL_MAP = new Map();
for (const level of LEVELS) {
  for (const item of level.items) {
    KANJI_LEVEL_MAP.set(item.id, level.level);
  }
}

function difficultyByLevel(kanjiId) {
  const levelNumber = KANJI_LEVEL_MAP.get(kanjiId);
  if (!levelNumber) return "medium";
  const totalLevels = LEVELS.length;
  if (levelNumber <= Math.ceil(totalLevels / 3)) return "low";
  if (levelNumber <= Math.ceil((totalLevels * 2) / 3)) return "medium";
  return "hard";
}

const HIRAGANA_KANA = [
  ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
  ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
  ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
  ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
  ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
  ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
  ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
  ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
  ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
  ["わ", "wa"], ["を", "wo"], ["ん", "n"],
];

const HIRAGANA_COMBINATION_GROUPS = [
  [["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"], ["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"]],
  [["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"], ["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"]],
  [["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"], ["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"]],
  [["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"], ["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"]],
  [["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"], ["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"]],
  [["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"]],
];

const KATAKANA_KANA = [
  ["ア", "a"], ["イ", "i"], ["ウ", "u"], ["エ", "e"], ["オ", "o"],
  ["カ", "ka"], ["キ", "ki"], ["ク", "ku"], ["ケ", "ke"], ["コ", "ko"],
  ["サ", "sa"], ["シ", "shi"], ["ス", "su"], ["セ", "se"], ["ソ", "so"],
  ["タ", "ta"], ["チ", "chi"], ["ツ", "tsu"], ["テ", "te"], ["ト", "to"],
  ["ナ", "na"], ["ニ", "ni"], ["ヌ", "nu"], ["ネ", "ne"], ["ノ", "no"],
  ["ハ", "ha"], ["ヒ", "hi"], ["フ", "fu"], ["ヘ", "he"], ["ホ", "ho"],
  ["マ", "ma"], ["ミ", "mi"], ["ム", "mu"], ["メ", "me"], ["モ", "mo"],
  ["ヤ", "ya"], ["ユ", "yu"], ["ヨ", "yo"],
  ["ラ", "ra"], ["リ", "ri"], ["ル", "ru"], ["レ", "re"], ["ロ", "ro"],
  ["ワ", "wa"], ["ヲ", "wo"], ["ン", "n"],
];

const KATAKANA_COMBINATION_GROUPS = [
  [["キャ", "kya"], ["キュ", "kyu"], ["キョ", "kyo"], ["ギャ", "gya"], ["ギュ", "gyu"], ["ギョ", "gyo"]],
  [["シャ", "sha"], ["シュ", "shu"], ["ショ", "sho"], ["ジャ", "ja"], ["ジュ", "ju"], ["ジョ", "jo"]],
  [["チャ", "cha"], ["チュ", "chu"], ["チョ", "cho"], ["ニャ", "nya"], ["ニュ", "nyu"], ["ニョ", "nyo"]],
  [["ヒャ", "hya"], ["ヒュ", "hyu"], ["ヒョ", "hyo"], ["ビャ", "bya"], ["ビュ", "byu"], ["ビョ", "byo"]],
  [["ピャ", "pya"], ["ピュ", "pyu"], ["ピョ", "pyo"], ["ミャ", "mya"], ["ミュ", "myu"], ["ミョ", "myo"]],
  [["リャ", "rya"], ["リュ", "ryu"], ["リョ", "ryo"]],
];

const HIRAGANA_MNEMONICS = {
  あ: "あ is an astronaut.",
  い: "い matches the double i sound in Hawaii.",
  う: "う looks like a tipped-over U with its tail pulled off.",
  え: "え can remind you of the end of vacation.",
  お: "お is a hole in one.",
  か: "か is a cat batting at a toy.",
  き: "き is a key.",
  く: "く is the cuckoo bird from a clock.",
  け: "け is a kestrel.",
  こ: "こ is two koi fish swimming.",
  さ: "さ is a samurai.",
  し: "し is Shi, with long hair.",
  す: "す is sunlight helping seeds grow.",
  せ: "せ is two friends watching the setting sun.",
  そ: "そ looks like the stitching in a sewing machine.",
  た: "た looks like ta with a couple of added strokes.",
  ち: "ち is a chicken.",
  つ: "つ is a tsunami wave.",
  て: "て is a broken tennis racket.",
  と: "と is a big toe.",
  な: "な is a nativity scene.",
  に: "に is a human knee.",
  ぬ: "ぬ is a noodle with chopsticks.",
  ね: "ね is a nectarine fallen from a tree.",
  の: "の is the no sign.",
  は: "は is someone walking on a branch.",
  ひ: "ひ is a man shouting hi.",
  ふ: "ふ is Mount Fuji.",
  へ: "へ points up toward heaven.",
  ほ: "ほ is a hockey game.",
  ま: "ま is a mailbox.",
  み: "み sounds like me: 'Me? I'm 21.'",
  む: "む is a smiling face with a musical note.",
  め: "め is a medal.",
  も: "も is more fish caught with more worms.",
  や: "や is a yak.",
  ゆ: "ゆ is a U-turn on the road.",
  よ: "よ is a yo-yo.",
  ら: "ら is a rabbit.",
  り: "り is a river.",
  る: "る is a ruby earring.",
  れ: "れ has a tiny raisin-sized hook at the end.",
  ろ: "ろ looks like the 3 in 'row, row, row.'",
  わ: "わ is a grave from a war.",
  を: "を is a worried man testing the water with one toe.",
  ん: "ん already looks like an N.",
};

const KATAKANA_MNEMONICS = {
  ア: "ア is an anchor.",
  イ: "イ looks like a stretched lowercase i.",
  ウ: "ウ is an umbrella.",
  エ: "エ is a baby elephant.",
  オ: "オ marks the origin on a graph.",
  カ: "カ is a cat.",
  キ: "キ is a key.",
  ク: "ク is the handle of a cup.",
  ケ: "ケ is a cane.",
  コ: "コ has two corners.",
  サ: "サ is a salsa or samba dancer.",
  シ: "シ is Shi smiling shyly.",
  ス: "ス is a seven with a support beam.",
  セ: "セ is someone committing seppuku.",
  ソ: "ソ is someone relaxing in soft beach waves.",
  タ: "タ is a tarantula.",
  チ: "チ is a cheater writing answers on a hand.",
  ツ: "ツ is people running from a tsunami.",
  テ: "テ is a table with a dish on top.",
  ト: "ト is the toes of a foot.",
  ナ: "ナ is a nail.",
  ニ: "ニ is the skin folds on a knee.",
  ヌ: "ヌ is the new crossed way of writing a seven.",
  ネ: "ネ is a businessman in a necktie.",
  ノ: "ノ is a no-smoking sign.",
  ン: "ン is the one-eyed version of シ, with a nice eyepatch.",
  ハ: "ハ is a stick snapped in half.",
  ヒ: "ヒ is the heel of a sock.",
  フ: "フ is a fool's hat.",
  ヘ: "ヘ points toward heaven.",
  ホ: "ホ is a holy cross.",
  マ: "マ is a mama giving permission for a cookie.",
  ミ: "ミ is a music staff with DO, RE, MI.",
  ム: "ム is a composer writing music.",
  メ: "メ is a medical syringe.",
  モ: "モ is more fish with more worms.",
  ヤ: "ヤ is a yak.",
  ユ: "ユ is the letter U turned on its side.",
  ヨ: "ヨ is a gangster saying yo.",
  ラ: "ラ is someone bowing to Ra, the sun god.",
  リ: "リ is a reed in a river.",
  ル: "ル is a tree root.",
  レ: "レ is an arrow showing how rain falls.",
  ロ: "ロ reminds you that squares do not roll.",
  ワ: "ワ is an overturned wagon.",
  ヲ: "ヲ is the 'world war one' mnemonic.",
};

const HIRAGANA_MNEMONIC_FILE_BY_ROMAJI = {
  a: "01-A.png",
  i: "02-I.png",
  u: "03-U.png",
  e: "04-E.png",
  o: "05-O.png",
  ka: "01-KA.png",
  ki: "02-KI.png",
  ku: "03-KU.png",
  ke: "04-KE.png",
  ko: "05-KO.png",
  sa: "01-SA.png",
  shi: "02-SHI.png",
  su: "03-SU.png",
  se: "04-SE.png",
  so: "05-SO.png",
  ta: "01-TA.png",
  chi: "02-CHI.png",
  tsu: "03-TSU.png",
  te: "04-TE.png",
  to: "05-TO.png",
  na: "01-NA.png",
  ni: "02-NI.png",
  nu: "03-NU.png",
  ne: "04-NE.png",
  no: "05-NO.png",
  ha: "01-HA.png",
  hi: "02-HI.png",
  fu: "03-FU.png",
  he: "04-HE.png",
  ho: "05-HO.png",
  ma: "01-MA.png",
  mi: "02-MI.png",
  mu: "03-MU.png",
  me: "04-ME.png",
  mo: "05-MO.png",
  ya: "01-YA.png",
  yu: "03-YU.png",
  yo: "05-YO.png",
  ra: "01-RA.png",
  ri: "02-RI.png",
  ru: "03-RU.png",
  re: "04-RE.png",
  ro: "05-RO.png",
  wa: "01-WA.png",
  wo: "05-WO.png",
  n: "00-N.png",
};

const KATAKANA_MNEMONIC_FILE_BY_ROMAJI = {
  a: "Kata_a.jpg",
  i: "Kata_i.jpg",
  u: "Kata_u.jpg",
  e: "Kata_e.jpg",
  o: "Kata_o.jpg",
  ka: "Kata_ka.jpg",
  ki: "Kata_ki.jpg",
  ku: "Kata_ku.jpg",
  ke: "Kata_ke.jpg",
  ko: "Kata_ko.jpg",
  sa: "Kata_sa.jpg",
  shi: "Kata_shi.jpg",
  su: "Kata_su.jpg",
  se: "Kata_se.jpg",
  so: "Kata_so.jpg",
  ta: "Kata_ta.jpg",
  chi: "Kata_chi.jpg",
  tsu: "Kata_tsu.jpg",
  te: "Kata_te.jpg",
  to: "Kata_to.jpg",
  na: "Kata_na.jpg",
  ni: "Kata_ni.jpg",
  nu: "Kata_nu.jpg",
  ne: "Kata_ne.jpg",
  no: "Kata_no.jpg",
  ha: "Kata_ha.jpg",
  hi: "Kata_hi.jpg",
  fu: "Kata_fu.jpg",
  he: "Kata_he.jpg",
  ho: "Kata_ho.jpg",
  ma: "Kata_ma.jpg",
  mi: "Kata_mi.jpg",
  mu: "Kata_mu.jpg",
  me: "Kata_me.jpg",
  mo: "Kata_mo.jpg",
  ya: "Kata_ya.jpg",
  yu: "Kata_yu.jpg",
  yo: "Kata_yo.jpg",
  ra: "Kata_ra.jpg",
  ri: "Kata_ri.jpg",
  ru: "Kata_ru.jpg",
  re: "Kata_re.jpg",
  ro: "Kata_ro.jpg",
  wa: "Kata_wa.jpg",
  wo: "Kata_wo.jpg",
  n: "Kata_n.jpg",
};

const COMBINATION_KANA_REFERENCE = {
  hiragana: {
    filename: "Hiragana Chart Seion Dakuon Yoon.png",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Hiragana_Chart_Seion_Dakuon_Yoon.png",
    title: "Hiragana Chart Seion Dakuon Yoon.png",
    author: "TealComet",
    license: "CC0 1.0",
  },
  katakana: {
    filename: "Katakana Chart Seion Dakuon Yoon.png",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Katakana_Chart_Seion_Dakuon_Yoon.png",
    title: "Katakana Chart Seion Dakuon Yoon.png",
    author: "TealComet",
    license: "CC0 1.0",
  },
};

function getKanaMnemonic(kind, char, romaji) {
  const builtIn = kind === "hiragana" ? HIRAGANA_MNEMONICS[char] : KATAKANA_MNEMONICS[char];
  if (builtIn) return builtIn;

  if (Array.from(String(char || "")).length > 1) {
    const [base, glide] = Array.from(char);
    return `${char} combines ${base} with the small ${glide} to make the sound ${String(romaji || "").toUpperCase()}.`;
  }

  return "Mnemonic coming soon.";
}

function isCombinationKana(char) {
  return Array.from(String(char || "")).length > 1;
}

function getKanaMnemonicImage(kind, romaji, char) {
  if (isCombinationKana(char)) {
    const ref = COMBINATION_KANA_REFERENCE[kind];
    return ref ? `https://commons.wikimedia.org/wiki/Special:FilePath/${ref.filename}` : null;
  }

  const key = String(romaji || "").toLowerCase();
  const filename =
    kind === "hiragana" ? HIRAGANA_MNEMONIC_FILE_BY_ROMAJI[key] : KATAKANA_MNEMONIC_FILE_BY_ROMAJI[key];
  if (!filename) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`;
}

function getKanaImageSourceMeta(kind, char) {
  if (isCombinationKana(char)) return COMBINATION_KANA_REFERENCE[kind] || null;
  return null;
}

const KANA_LEVEL_SIZE = 5;
const KANA_LEVEL_INTROS = {
  hiragana: "In this level you will study basic hiragana, we will start with the vowels.",
  katakana: "In this level you will study basic katakana, we will start with the vowels.",
};

function toKanaItems(list) {
  return list.map(([char, romaji], index) => ({
    id: char,
    char,
    romaji,
    meaning: String(romaji || "").toUpperCase(),
    index,
  }));
}

function buildKanaLevels(baseItems, combinationGroups, kind) {
  const groups = [];

  for (let i = 0; i < baseItems.length; i += KANA_LEVEL_SIZE) {
    groups.push(baseItems.slice(i, i + KANA_LEVEL_SIZE));
  }

  const baseLevelCount = groups.length;
  const combinationItems = combinationGroups.map((group) => toKanaItems(group)).filter((group) => group.length);
  groups.push(...combinationItems);

  const levels = [];
  for (let i = 0; i < groups.length; i += 1) {
    const items = groups[i];
    const isCombinationLevel = i >= baseLevelCount;
    levels.push({
      level: levels.length + 1,
      kind,
      items,
      summary:
        levels.length === 0
          ? KANA_LEVEL_INTROS[kind]
          : isCombinationLevel
            ? `In this level you will study ${kind} combination kana made with small ya, yu, and yo sounds.`
            : `In this level you will continue practicing core ${kind} sounds and recognition patterns.`,
    });
  }
  return levels;
}

const HIRAGANA_ITEMS = toKanaItems([...HIRAGANA_KANA, ...HIRAGANA_COMBINATION_GROUPS.flat()]);
const KATAKANA_ITEMS = toKanaItems([...KATAKANA_KANA, ...KATAKANA_COMBINATION_GROUPS.flat()]);
const HIRAGANA_LEVELS = buildKanaLevels(toKanaItems(HIRAGANA_KANA), HIRAGANA_COMBINATION_GROUPS, "hiragana");
const KATAKANA_LEVELS = buildKanaLevels(toKanaItems(KATAKANA_KANA), KATAKANA_COMBINATION_GROUPS, "katakana");

function progressStatusFor(type, id) {
  const progress = getProgress(type, id);
  if (!progress) return "not-started";
  if (isGuruOrAbove(progress.stage)) return "completed";
  return "in-progress";
}

function statusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "in-progress") return "In progress";
  return "Not started";
}

function countCompletedInKanaLevel(level) {
  return level.items.filter((item) => progressStatusFor(level.kind, item.id) === "completed").length;
}

const SIMPLE_KANA_EXAMPLES = {
  hiragana: {
    あ: [{ word: "あし", reading: "あし", meaning: "foot, leg" }, { word: "あか", reading: "あか", meaning: "red" }],
    い: [{ word: "いえ", reading: "いえ", meaning: "house" }, { word: "いぬ", reading: "いぬ", meaning: "dog" }],
    う: [{ word: "うみ", reading: "うみ", meaning: "sea" }, { word: "うえ", reading: "うえ", meaning: "up, above" }],
    え: [{ word: "えき", reading: "えき", meaning: "station" }, { word: "え", reading: "え", meaning: "picture" }],
    お: [{ word: "おと", reading: "おと", meaning: "sound" }, { word: "おに", reading: "おに", meaning: "ogre" }],
    か: [{ word: "かお", reading: "かお", meaning: "face" }, { word: "かさ", reading: "かさ", meaning: "umbrella" }],
    き: [{ word: "き", reading: "き", meaning: "tree" }, { word: "きた", reading: "きた", meaning: "north" }],
    く: [{ word: "くち", reading: "くち", meaning: "mouth" }, { word: "くに", reading: "くに", meaning: "country" }],
    け: [{ word: "け", reading: "け", meaning: "fur, hair" }, { word: "けむり", reading: "けむり", meaning: "smoke" }],
    こ: [{ word: "こえ", reading: "こえ", meaning: "voice" }, { word: "こども", reading: "こども", meaning: "child" }],
    さ: [{ word: "さけ", reading: "さけ", meaning: "salmon" }, { word: "さる", reading: "さる", meaning: "monkey" }],
    し: [{ word: "しか", reading: "しか", meaning: "deer" }, { word: "しお", reading: "しお", meaning: "salt" }],
    す: [{ word: "すし", reading: "すし", meaning: "sushi" }, { word: "すな", reading: "すな", meaning: "sand" }],
    せ: [{ word: "せかい", reading: "せかい", meaning: "world" }, { word: "せなか", reading: "せなか", meaning: "back" }],
    そ: [{ word: "そら", reading: "そら", meaning: "sky" }, { word: "そと", reading: "そと", meaning: "outside" }],
    た: [{ word: "たこ", reading: "たこ", meaning: "octopus" }, { word: "たね", reading: "たね", meaning: "seed" }],
    ち: [{ word: "ちず", reading: "ちず", meaning: "map" }, { word: "ちち", reading: "ちち", meaning: "father" }],
    つ: [{ word: "つき", reading: "つき", meaning: "moon" }, { word: "つくえ", reading: "つくえ", meaning: "desk" }],
    て: [{ word: "て", reading: "て", meaning: "hand" }, { word: "てら", reading: "てら", meaning: "temple" }],
    と: [{ word: "とり", reading: "とり", meaning: "bird" }, { word: "とけい", reading: "とけい", meaning: "clock" }],
    な: [{ word: "なつ", reading: "なつ", meaning: "summer" }, { word: "なまえ", reading: "なまえ", meaning: "name" }],
    に: [{ word: "にく", reading: "にく", meaning: "meat" }, { word: "にわ", reading: "にわ", meaning: "garden" }],
    ぬ: [{ word: "ぬの", reading: "ぬの", meaning: "cloth" }, { word: "いぬ", reading: "いぬ", meaning: "dog" }],
    ね: [{ word: "ねこ", reading: "ねこ", meaning: "cat" }, { word: "ねつ", reading: "ねつ", meaning: "fever, heat" }],
    の: [{ word: "のり", reading: "のり", meaning: "glue, seaweed" }, { word: "のみもの", reading: "のみもの", meaning: "drink" }],
    は: [{ word: "はな", reading: "はな", meaning: "flower" }, { word: "はこ", reading: "はこ", meaning: "box" }],
    ひ: [{ word: "ひ", reading: "ひ", meaning: "sun, day, fire" }, { word: "ひと", reading: "ひと", meaning: "person" }],
    ふ: [{ word: "ふね", reading: "ふね", meaning: "boat" }, { word: "ふゆ", reading: "ふゆ", meaning: "winter" }],
    へ: [{ word: "へや", reading: "へや", meaning: "room" }, { word: "へび", reading: "へび", meaning: "snake" }],
    ほ: [{ word: "ほし", reading: "ほし", meaning: "star" }, { word: "ほん", reading: "ほん", meaning: "book" }],
    ま: [{ word: "まど", reading: "まど", meaning: "window" }, { word: "まめ", reading: "まめ", meaning: "bean" }],
    み: [{ word: "みず", reading: "みず", meaning: "water" }, { word: "みみ", reading: "みみ", meaning: "ear" }],
    む: [{ word: "むし", reading: "むし", meaning: "bug, insect" }, { word: "むら", reading: "むら", meaning: "village" }],
    め: [{ word: "め", reading: "め", meaning: "eye" }, { word: "めがね", reading: "めがね", meaning: "glasses" }],
    も: [{ word: "もり", reading: "もり", meaning: "forest" }, { word: "もも", reading: "もも", meaning: "peach" }],
    や: [{ word: "やま", reading: "やま", meaning: "mountain" }, { word: "やさい", reading: "やさい", meaning: "vegetable" }],
    ゆ: [{ word: "ゆき", reading: "ゆき", meaning: "snow" }, { word: "ゆび", reading: "ゆび", meaning: "finger" }],
    よ: [{ word: "よる", reading: "よる", meaning: "night" }, { word: "よこ", reading: "よこ", meaning: "side" }],
    ら: [{ word: "らいおん", reading: "らいおん", meaning: "lion" }, { word: "らくがき", reading: "らくがき", meaning: "doodle" }],
    り: [{ word: "りんご", reading: "りんご", meaning: "apple" }, { word: "りす", reading: "りす", meaning: "squirrel" }],
    る: [{ word: "るす", reading: "るす", meaning: "absence" }, { word: "くるま", reading: "くるま", meaning: "car" }],
    れ: [{ word: "れいぞうこ", reading: "れいぞうこ", meaning: "refrigerator" }, { word: "れきし", reading: "れきし", meaning: "history" }],
    ろ: [{ word: "ろうそく", reading: "ろうそく", meaning: "candle" }, { word: "ろく", reading: "ろく", meaning: "six" }],
    わ: [{ word: "わに", reading: "わに", meaning: "crocodile" }, { word: "わたし", reading: "わたし", meaning: "I, me" }],
    を: [{ word: "みずをのむ", reading: "みずをのむ", meaning: "to drink water" }],
    ん: [{ word: "ぱん", reading: "ぱん", meaning: "bread" }, { word: "ほん", reading: "ほん", meaning: "book" }],
  },
  katakana: {
    ア: [{ word: "アイス", reading: "アイス", meaning: "ice cream" }],
    イ: [{ word: "イヌ", reading: "イヌ", meaning: "dog" }],
    ウ: [{ word: "ウニ", reading: "ウニ", meaning: "sea urchin" }],
    エ: [{ word: "エア", reading: "エア", meaning: "air" }],
    オ: [{ word: "オイル", reading: "オイル", meaning: "oil" }],
    カ: [{ word: "カメラ", reading: "カメラ", meaning: "camera" }],
    キ: [{ word: "キウイ", reading: "キウイ", meaning: "kiwi" }],
    ク: [{ word: "クラス", reading: "クラス", meaning: "class" }],
    ケ: [{ word: "ケーキ", reading: "ケーキ", meaning: "cake" }],
    コ: [{ word: "コーヒー", reading: "コーヒー", meaning: "coffee" }],
    サ: [{ word: "サラダ", reading: "サラダ", meaning: "salad" }],
    シ: [{ word: "シャツ", reading: "シャツ", meaning: "shirt" }],
    ス: [{ word: "スープ", reading: "スープ", meaning: "soup" }],
    セ: [{ word: "セーター", reading: "セーター", meaning: "sweater" }],
    ソ: [{ word: "ソファ", reading: "ソファ", meaning: "sofa" }],
    タ: [{ word: "タクシー", reading: "タクシー", meaning: "taxi" }],
    チ: [{ word: "チーズ", reading: "チーズ", meaning: "cheese" }],
    ツ: [{ word: "ツアー", reading: "ツアー", meaning: "tour" }],
    テ: [{ word: "テスト", reading: "テスト", meaning: "test" }],
    ト: [{ word: "トマト", reading: "トマト", meaning: "tomato" }],
    ナ: [{ word: "ナイフ", reading: "ナイフ", meaning: "knife" }],
    ニ: [{ word: "ニュース", reading: "ニュース", meaning: "news" }],
    ヌ: [{ word: "ヌードル", reading: "ヌードル", meaning: "noodle" }],
    ネ: [{ word: "ネコ", reading: "ネコ", meaning: "cat" }],
    ノ: [{ word: "ノート", reading: "ノート", meaning: "notebook" }],
    ハ: [{ word: "ハム", reading: "ハム", meaning: "ham" }],
    ヒ: [{ word: "ヒーロー", reading: "ヒーロー", meaning: "hero" }],
    フ: [{ word: "フォーク", reading: "フォーク", meaning: "fork" }],
    ヘ: [{ word: "ヘルメット", reading: "ヘルメット", meaning: "helmet" }],
    ホ: [{ word: "ホテル", reading: "ホテル", meaning: "hotel" }],
    マ: [{ word: "マスク", reading: "マスク", meaning: "mask" }],
    ミ: [{ word: "ミルク", reading: "ミルク", meaning: "milk" }],
    ム: [{ word: "ムービー", reading: "ムービー", meaning: "movie" }],
    メ: [{ word: "メモ", reading: "メモ", meaning: "memo" }],
    モ: [{ word: "モール", reading: "モール", meaning: "mall" }],
    ヤ: [{ word: "ヤード", reading: "ヤード", meaning: "yard" }],
    ユ: [{ word: "ユニフォーム", reading: "ユニフォーム", meaning: "uniform" }],
    ヨ: [{ word: "ヨガ", reading: "ヨガ", meaning: "yoga" }],
    ラ: [{ word: "ラジオ", reading: "ラジオ", meaning: "radio" }],
    リ: [{ word: "リボン", reading: "リボン", meaning: "ribbon" }],
    ル: [{ word: "ルール", reading: "ルール", meaning: "rule" }],
    レ: [{ word: "レモン", reading: "レモン", meaning: "lemon" }],
    ロ: [{ word: "ロボット", reading: "ロボット", meaning: "robot" }],
    ワ: [{ word: "ワイン", reading: "ワイン", meaning: "wine" }],
    ヲ: [{ word: "ヲタク", reading: "ヲタク", meaning: "otaku" }],
    ン: [{ word: "パン", reading: "パン", meaning: "bread" }],
  },
};

function getKanaVocabularyExamples(kind, char) {
  const curated = SIMPLE_KANA_EXAMPLES[kind]?.[char];
  if (curated?.length) return curated;

  const target = katakanaToHiragana(char);
  const seen = new Set();

  return VOCAB.filter((entry) => katakanaToHiragana(entry.reading || "").includes(target))
    .filter((entry) => {
      const key = `${entry.word}|${entry.reading}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function findLevelForKanji(kanjiId) {
  return LEVELS.find((level) => level.items.some((item) => item.id === kanjiId)) || null;
}

function lessonsToday() {
  const RADICAL_LIMIT = 5;
  const KANJI_LIMIT = 5;
  const VOCAB_LIMIT = 5;
  const BUFFER = 3;

  const radicals = RADICALS.filter((r) => isNew("radical", r.id)).slice(0, RADICAL_LIMIT);

  const kanji = KANJI.filter((k) => isNew("kanji", k.id));
  const kanjiUnlocked = [];
  const kanjiLocked = [];

  for (const k of kanji) {
    const radicalIds = KANJI_RADICALS.filter((kr) => kr.kanjiId === k.id).map((kr) => kr.radicalId);
    const allGuru = radicalIds.every((rid) => {
      const p = getProgress("radical", rid);
      return p && isGuruOrAbove(p.stage);
    });
    if (allGuru) kanjiUnlocked.push(k);
    else kanjiLocked.push(k);
  }

  const selectedKanji = [
    ...kanjiUnlocked.slice(0, KANJI_LIMIT),
    ...kanjiLocked.slice(0, Math.max(0, BUFFER - kanjiUnlocked.length)),
  ].slice(0, KANJI_LIMIT);

  const vocab = VOCAB.filter((v) => isNew("vocab", v.id));
  const vocabUnlocked = [];
  const vocabLocked = [];

  for (const v of vocab) {
    const p = getProgress("kanji", v.kanjiId);
    if (p && isGuruOrAbove(p.stage)) vocabUnlocked.push(v);
    else vocabLocked.push(v);
  }

  const selectedVocab = [
    ...vocabUnlocked.slice(0, VOCAB_LIMIT),
    ...vocabLocked.slice(0, Math.max(0, BUFFER - vocabUnlocked.length)),
  ].slice(0, VOCAB_LIMIT);

  return [
    ...radicals.map((r) => ({ type: "radical", item: r })),
    ...selectedKanji.map((k) => ({ type: "kanji", item: k })),
    ...selectedVocab.map((v) => ({ type: "vocab", item: v })),
  ];
}

function reviewsDue() {
  const schedule = getScheduleMap();
  const dueItems = Object.entries(schedule)
    .filter(([, timeMs]) => timeMs <= nowMs())
    .map(([key]) => key);

  return dueItems.map((key) => {
    const [type, idStr] = key.split(":");
    const id = Number(idStr);

    if (type === "radical") {
      const r = RADICALS.find((x) => x.id === id);
      return { type, id, prompt: r.symbol, meanings: [r.meaning], readings: [] };
    }

    if (type === "kanji") {
      const k = KANJI.find((x) => x.id === id);
      const readings = READINGS.filter((r) => r.kanjiId === id).map((r) => r.reading);
      return { type, id, prompt: k.character, meanings: [k.meaning], readings };
    }

    const v = VOCAB.find((x) => x.id === id);
    return { type, id, prompt: v.word, meanings: [v.meaning], readings: [v.reading] };
  });
}

function buildPracticeItemsForKanjiIds(kanjiIds) {
  return kanjiIds
    .map((id) => {
      const k = KANJI.find((x) => x.id === id);
      if (!k) return null;
      const readings = READINGS.filter((r) => r.kanjiId === id).map((r) => r.reading);
      return { type: "kanji", id, prompt: k.character, meanings: [k.meaning], readings };
    })
    .filter(Boolean);
}

function shuffleItems(items) {
  const shuffled = [...(items || [])];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function splitIntoColumns(items, columnCount) {
  const columns = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });
  return columns;
}

function computeStats() {
  const progress = getProgressMap();
  const schedule = getScheduleMap();
  const learned = Object.keys(progress).length;
  const due = Object.values(schedule).filter((t) => t <= nowMs()).length;
  return {
    totalKanji: KANJI.length,
    totalRadicals: RADICALS.length,
    totalVocab: VOCAB.length,
    learned,
    due,
  };
}

function countLearnedInLevel(levelItems) {
  return levelItems.filter((k) => getProgress("kanji", k.id)).length;
}

function AtomIcon() {
  return (
    <svg className="level-card-atom" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
      <ellipse cx="16" cy="16" rx="10.5" ry="4.7" stroke="currentColor" strokeWidth="1.5" />
      <ellipse
        cx="16"
        cy="16"
        rx="10.5"
        ry="4.7"
        transform="rotate(60 16 16)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="10.5"
        ry="4.7"
        transform="rotate(120 16 16)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function levelSummary(levelItems) {
  const meanings = levelItems.map((k) => String(k.meaning || "").toLowerCase());
  const avgStrokes =
    levelItems.reduce((sum, k) => sum + (k.strokeCount || 0), 0) / Math.max(levelItems.length, 1);

  const jlptCount = {};
  for (const item of levelItems) {
    if (item.jlpt == null) continue;
    jlptCount[item.jlpt] = (jlptCount[item.jlpt] || 0) + 1;
  }
  const dominantJlpt = Object.entries(jlptCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const themes = [
    { label: "daily life", keys: ["day", "sun", "moon", "time", "year", "month", "week", "morning", "night"] },
    { label: "people and society", keys: ["person", "man", "woman", "child", "parent", "friend", "name", "work"] },
    { label: "nature", keys: ["water", "tree", "wood", "mountain", "river", "fire", "earth", "rain", "wind"] },
    { label: "movement and action", keys: ["go", "come", "walk", "enter", "exit", "move", "run", "open", "close"] },
    { label: "abstract concepts", keys: ["right", "left", "new", "old", "big", "small", "middle", "high", "low"] },
  ];

  const themeScores = themes
    .map((theme) => ({
      label: theme.label,
      score: meanings.reduce(
        (count, meaning) => count + (theme.keys.some((key) => meaning.includes(key)) ? 1 : 0),
        0
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const topTheme = themeScores[0]?.score > 0 ? themeScores[0].label : "core foundational";
  const complexity =
    avgStrokes < 6 ? "lighter stroke patterns" : avgStrokes < 10 ? "balanced stroke complexity" : "denser forms";
  const examples = levelItems
    .slice(0, 3)
    .map((k) => `${k.character} (${k.meaning})`)
    .join(", ");

  return `In this level you'll study ${topTheme} kanji with ${complexity}. You will practice items like ${examples}${
    dominantJlpt ? `, mostly around JLPT N${dominantJlpt}.` : "."
  }`;
}

function practiceLevelSummary(levelNumber) {
  if (levelNumber <= 2) {
    return "In this level you'll study basic simple kanji from numbers to days of the week.";
  }
  if (levelNumber <= 6) {
    return "In this level you'll review practical everyday kanji used across common words and contexts.";
  }
  return "In this level you'll practice more advanced kanji with broader meanings and denser forms.";
}

function HomeIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.6L12 4L20 10.6V19A1 1 0 0 1 19 20H5A1 1 0 0 1 4 19V10.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 20V14.5H14.5V20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PracticeIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M13.5 4.8L9 12H13.2L10.6 19.2L15 12H10.8L13.5 4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LevelsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="11.5" width="4" height="8.5" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10" y="7" width="4" height="13" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
      <rect x="16" y="4" width="4" height="16" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 12.2L10.8 15L16 9.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10V16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

function UserCircleIcon() {
  return (
    <svg className="nav-icon nav-user-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.25" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 18.2C6.9 15.55 9.1 14.25 12 14.25C14.9 14.25 17.1 15.55 18.5 18.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ExpandDownIcon() {
  return (
    <svg className="all-kanji-select-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true" data-node-id="1:3252">
      <path d="M7 10L12 15L17 10" stroke="#33363F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardStatsIcon() {
  return (
    <svg className="home-card-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="11" width="3.8" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10.1" y="6" width="3.8" height="14" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
      <rect x="16.2" y="3" width="3.8" height="17" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function HomeActionCard({ title, description, icon, cta, onClick }) {
  return (
    <article className="home-action-card">
      <div className="home-action-title">
        {icon}
        <h3>{title}</h3>
      </div>
      <p>{description}</p>
      <button className="home-action-btn" onClick={onClick}>
        {cta}
        <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

function DirectoryArtwork({ kind, className = "" }) {
  const classes = ["directory-card-artwork", `directory-art-${kind}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} aria-hidden="true">
      <span className="directory-card-art-glyph">
        {kind === "hiragana" ? "あ" : kind === "katakana" ? "ア" : "語"}
      </span>
    </div>
  );
}

function DirectoryCard({ kind, char, title, countText, cta, onOpen }) {
  return (
    <article className="directory-card">
      <DirectoryArtwork kind={kind} />
      <div className="directory-card-content">
        <div className="directory-card-title">
          <span>{char}</span>
          <h3>{title}</h3>
        </div>
        <p>{countText}</p>
        <button className="directory-card-btn" onClick={onOpen}>
          {cta}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}

function DirectoryView({ onOpenTrack }) {
  const cards = [
    {
      kind: "hiragana",
      char: "あ",
      title: "Hiragana",
      countText: `${HIRAGANA_ITEMS.length} kanas`,
      cta: "See all hiragana",
    },
    {
      kind: "katakana",
      char: "ア",
      title: "Katakana",
      countText: `${KATAKANA_ITEMS.length} kanas`,
      cta: "See all katakana",
    },
    {
      kind: "kanji",
      char: "語",
      title: "Kanji",
      countText: `${KANJI.length} kanji`,
      cta: "See all kanji",
    },
  ];

  return (
    <section className="directory-screen" data-node-id="58:5362">
      <header className="directory-header">
        <span className="directory-header-icon" aria-hidden="true">
          語
        </span>
        <h2>Directory</h2>
      </header>
      <div className="directory-list">
        {cards.map((card) => (
          <DirectoryCard key={card.kind} {...card} onOpen={() => onOpenTrack(card.kind)} />
        ))}
      </div>
    </section>
  );
}

function userInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function AccountMenu({ user, mobile = false, onAction }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointer(event) {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointer);
    return () => window.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  const actions = user
    ? [
        { key: "account", label: "Account", description: "Manage login and plan" },
        { key: "pricing", label: "Unlock full app", description: "One-time payment unlock" },
      ]
    : [
        { key: "login", label: "Log in", description: "Continue your saved progress" },
        { key: "register", label: "Create account", description: "Start syncing your trial" },
        { key: "pricing", label: "Unlock full app", description: "See trial and full access" },
      ];

  return (
    <div className={`account-menu ${mobile ? "is-mobile" : "is-desktop"}`} ref={menuRef}>
      <button
        className={mobile ? "mobile-account-button" : "desktop-user-button"}
        type="button"
        aria-label="Account options"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {user ? <span className="desktop-user-avatar">{userInitials(user.name)}</span> : <UserCircleIcon />}
        <span className={mobile ? "mobile-account-inline" : "desktop-user-name"}>Account</span>
      </button>
      {open ? (
        <div className={`account-menu-panel ${mobile ? "is-mobile" : "is-desktop"}`}>
          {actions.map((action) => (
            <button
              key={action.key}
              className="account-menu-item"
              type="button"
              onClick={() => {
                setOpen(false);
                onAction(action.key);
              }}
            >
              <strong>{action.label}</strong>
              <span>{action.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Nav({ current, onChange, user, onUserAction }) {
  const tabs = [
    { key: "home", label: "Home", icon: <HomeIcon /> },
    { key: "levels", label: "Study", icon: <LevelsIcon /> },
    { key: "kanji", label: "Directory", icon: <span className="nav-kanji-icon">語</span> },
    { key: "practice", label: "Practice", icon: <PracticeIcon /> },
    { key: "progress", label: "Progress", icon: <ProgressIcon /> },
  ];

  return (
    <nav className="figma-navbar" data-node-id="18:661">
      <button className="desktop-brand-mark" onClick={() => onChange("home")} aria-label="Go to home">
        <span className="desktop-brand-glyph">語</span>
        <span className="desktop-brand-text">Japanese Learning App</span>
      </button>
      <div className="figma-navbar-list" data-node-id="1:9567">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`figma-nav-pill ${current === t.key ? "is-active" : ""}`}
          >
            {t.icon}
            <span className="figma-nav-label">{t.label}</span>
          </button>
        ))}
      </div>
      <AccountMenu user={user} onAction={onUserAction} />
    </nav>
  );
}

function AuthModal({
  open,
  mode,
  user,
  pending,
  error,
  onModeChange,
  onClose,
  onSubmit,
  onRedeemAccess,
  onLogout,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accessKey, setAccessKey] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
      setAccessKey("");
      setShowPassword(false);
      return;
    }
    if (mode === "login") {
      setName("");
    }
  }, [open, mode]);

  if (!open) return null;

  const title =
    mode === "pricing" ? "Unlock full app" : user ? "Account" : mode === "login" ? "Log in" : "Create account";
  const fullAccess = hasFullAccess(user);

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <section className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div>
            <h2>{title}</h2>
            <p>
              {user
                ? "Your progress is now tied to this account."
                : "Use your account to save progress across sessions."}
            </p>
          </div>
          <button className="auth-close-btn" type="button" onClick={onClose} aria-label="Close account dialog">
            ×
          </button>
        </div>

        {mode === "pricing" ? (
          <div className="pricing-panel">
            <div className="pricing-card is-trial">
              <div className="pricing-card-header">
                <h3>Free trial</h3>
                {!fullAccess ? <span className="plan-status-badge">Current</span> : null}
              </div>
              <p>Try the app with the first {FREE_KANJI_LEVEL_LIMIT} kanji levels and the first {FREE_KANA_LEVEL_LIMIT} levels of hiragana and katakana.</p>
            </div>
            <div className="pricing-card is-full">
              <div className="pricing-card-header">
                <h3>Full experience</h3>
                {fullAccess ? <span className="plan-status-badge">Current</span> : null}
              </div>
              <p>Unlock every level, all study paths, and the full practice catalog with a one-time payment.</p>
              <p className="pricing-note">
                Checkout is not wired yet. This menu is ready for a payment integration step next.
              </p>
            </div>
            <div className="pricing-card is-code">
              <div className="pricing-card-header">
                <h3>Redeem access key</h3>
                {fullAccess ? <span className="plan-status-badge">Active</span> : null}
              </div>
              <p>Use your private unlock key to grant full app access without payment.</p>
              {user ? (
                <form
                  className="redeem-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onRedeemAccess(accessKey);
                  }}
                >
                  <label className="auth-field">
                    <span>Access key</span>
                    <div className="password-field">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        placeholder="Paste your unlock key"
                        autoComplete="off"
                      />
                      <button
                        className="password-toggle-btn"
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide access key" : "Show access key"}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </label>
                  {error ? <p className="auth-error">{error}</p> : null}
                  <button className="auth-primary-btn" type="submit" disabled={pending}>
                    {pending ? "Checking..." : "Redeem key"}
                  </button>
                </form>
              ) : (
                <p className="pricing-note">Log in or create an account first, then redeem the access key here.</p>
              )}
            </div>
          </div>
        ) : user ? (
          <div className="auth-account-panel">
            <div className="auth-account-summary">
              <span className="desktop-user-avatar">{userInitials(user.name)}</span>
              <div>
                <strong>{user.name}</strong>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="account-plan-card">
              <div className="pricing-card-header">
                <strong>{fullAccess ? "Full access" : "Free trial"}</strong>
                <span className="plan-status-badge">Current</span>
              </div>
              <p>
                {fullAccess
                  ? "This account has the full experience unlocked."
                  : `Trial includes kanji levels 1-${FREE_KANJI_LEVEL_LIMIT} and kana levels 1-${FREE_KANA_LEVEL_LIMIT}.`}
              </p>
            </div>
            <button className="auth-primary-btn auth-danger-btn" type="button" onClick={onLogout} disabled={pending}>
              Log out
            </button>
          </div>
        ) : (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({ name, email, password });
            }}
          >
            {mode === "register" ? (
              <label className="auth-field">
                <span>Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </label>
            ) : null}

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  className="password-toggle-btn"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error ? <p className="auth-error">{error}</p> : null}

            <button className="auth-primary-btn" type="submit" disabled={pending}>
              {pending ? "Saving..." : mode === "login" ? "Log in" : "Create account"}
            </button>

            <button
              className="auth-switch-btn"
              type="button"
              onClick={() => onModeChange(mode === "login" ? "register" : "login")}
              disabled={pending}
            >
              {mode === "login" ? "Need an account? Create one" : "Already have an account? Log in"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function UnlockSuccessModal({ open, title, message, onClose }) {
  if (!open) return null;

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <section className="auth-modal auth-modal-success" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div>
            <h2>{title}</h2>
            <p>{message}</p>
          </div>
          <button className="auth-close-btn" type="button" onClick={onClose} aria-label="Close success dialog">
            ×
          </button>
        </div>
        <div className="unlock-success-card">
          <div className="unlock-success-badge" aria-hidden="true">
            ✓
          </div>
          <strong>Success! Now you have access to the full app.</strong>
          <p>
            All lesson levels, study paths, and practice options are now unlocked for this account.
          </p>
        </div>
        <button className="auth-primary-btn" type="button" onClick={onClose}>
          Continue
        </button>
      </section>
    </div>
  );
}

function SyncStatusBanner({ notice, onDismiss, onRetry }) {
  if (!notice) return null;

  return (
    <div className={`sync-status-banner is-${notice.type || "warning"}`} role="status" aria-live="polite">
      <div className="sync-status-copy">
        <strong>{notice.title}</strong>
        <p>{notice.message}</p>
      </div>
      <div className="sync-status-actions">
        {onRetry ? (
          <button type="button" className="sync-status-btn" onClick={onRetry}>
            Retry
          </button>
        ) : null}
        <button type="button" className="sync-status-btn is-secondary" onClick={onDismiss} aria-label="Dismiss sync notice">
          ×
        </button>
      </div>
    </div>
  );
}

function DesktopAttributionFooter({ onNavigate }) {
  return (
    <button className="home-attribution-footer" onClick={() => onNavigate("attribution")}>
      <span className="home-attribution-brand">
        <span className="home-attribution-glyph">語</span>
        <span>Japanese Learning App - 2026</span>
      </span>
      <span className="home-attribution-link">
        <span>Attribution</span>
        <InfoIcon />
      </span>
    </button>
  );
}

function MobileBrandHeader({ onClick, user, onUserAction }) {
  return (
    <div className="mobile-topbar">
      <button className="mobile-brand-header" type="button" onClick={onClick} aria-label="Go to home">
        <span className="mobile-brand-text">Japanese Learning App</span>
      </button>
      <AccountMenu user={user} mobile onAction={onUserAction} />
    </div>
  );
}

function HomeView({ stats, onNavigate }) {
  if (!stats) return <p>Loading...</p>;
  return (
    <section className="home-screen" data-node-id="18:660">
      <header className="home-header">
        <p>
          Welcome. <strong>Where would you like to start?</strong>
        </p>
      </header>
      <div className="home-actions">
        <HomeActionCard
          title="Study by level"
          icon={<CardStatsIcon />}
          description="Study hiragana, katakana and kanji by levels from the easiest to the most complex ones."
          cta="Check levels"
          onClick={() => onNavigate("levels")}
        />
        <HomeActionCard
          title="Directory"
          icon={<span className="home-card-kanji">語</span>}
          description="Check all the kanas and kanji you can study. Filter by easiness of learning or by specific meaning (For kanji only)"
          cta="Check all"
          onClick={() => onNavigate("kanji")}
        />
        <HomeActionCard
          title="Practice"
          icon={<PracticeIcon />}
          description="Practice what you've learned in the app. You can choose what and how to practice."
          cta="Check all"
          onClick={() => onNavigate("practice")}
        />
        <HomeActionCard
          title="Progress"
          icon={<ProgressIcon />}
          description="Check your progress in learning kanas and kanji. You can track your progress here."
          cta="Check progress"
          onClick={() => onNavigate("progress")}
        />
      </div>
      <div className="home-hero" aria-hidden="true">
        <img src={HOME_HERO_IMAGE} alt="" />
      </div>
      <div className="home-mobile-attribution-card">
        <HomeActionCard
          title="Attribution"
          icon={<InfoIcon />}
          description="See image source links and license attribution for kana mnemonic graphics used in lessons."
          cta="View attribution"
          onClick={() => onNavigate("attribution")}
        />
      </div>
    </section>
  );
}

function AttributionView() {
  return (
    <section className="attribution-screen">
      <header className="all-kanji-header">
        <InfoIcon />
        <h2>Attribution</h2>
      </header>
      <article className="attribution-card">
        <h3>Kana Mnemonic Graphics</h3>
        <p>
          The hiragana and katakana mnemonic lesson graphics for the base kana are sourced from Wikimedia Commons and
          displayed via direct file URLs. Combination kana lessons use Wikimedia Commons reference charts that include
          yoon combinations.
        </p>
        <ul>
          <li>
            <a href="https://commons.wikimedia.org/wiki/Category:Hiragana_mnemonic_scetches_(image_set)" target="_blank" rel="noreferrer">
              Hiragana mnemonic image set
            </a>
          </li>
          <li>
            <a href="https://commons.wikimedia.org/wiki/Category:Katakana_mnemonic_scetches_(image_set)" target="_blank" rel="noreferrer">
              Katakana mnemonic image set
            </a>
          </li>
          <li>
            <a href={COMBINATION_KANA_REFERENCE.hiragana.pageUrl} target="_blank" rel="noreferrer">
              {COMBINATION_KANA_REFERENCE.hiragana.title}
            </a>
            {" "}- {COMBINATION_KANA_REFERENCE.hiragana.author}
          </li>
          <li>
            <a href={COMBINATION_KANA_REFERENCE.katakana.pageUrl} target="_blank" rel="noreferrer">
              {COMBINATION_KANA_REFERENCE.katakana.title}
            </a>
            {" "}- {COMBINATION_KANA_REFERENCE.katakana.author}
          </li>
        </ul>
      </article>
      <article className="attribution-card">
        <h3>License</h3>
        <p>
          Wikimedia Commons content in these sets is published under Creative Commons licenses (the categories indicate
          CC BY-SA 4.0). The yoon combination charts are published under CC0 1.0. Please verify each individual file
          page for exact attribution details when redistributing.
        </p>
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
          CC BY-SA 4.0 License
        </a>
        <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noreferrer">
          CC0 1.0 Universal
        </a>
      </article>
    </section>
  );
}

function LockIcon() {
  return (
    <svg className="status-lock-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M5.333 6.667V5.333a2.667 2.667 0 1 1 5.334 0v1.334M4.667 6.667h6.666c.368 0 .667.298.667.666v4.334a.667.667 0 0 1-.667.666H4.667A.667.667 0 0 1 4 11.667V7.333c0-.368.298-.666.667-.666Z"
        stroke="currentColor"
        strokeWidth="1.333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrackStatusPill({ status, locked = false }) {
  return (
    <span className={`kanji-status-badge status-${status} ${locked ? "is-locked" : ""}`}>
      {locked ? <LockIcon /> : null}
      <span>{statusLabel(status)}</span>
    </span>
  );
}

function computeTrackCard(kind) {
  if (kind === "kanji") {
    const completedLevels = LEVELS.filter((lvl) => countLearnedInLevel(lvl.items) >= lvl.items.length).length;
    const status =
      completedLevels === 0 ? "not-started" : completedLevels === LEVELS.length ? "completed" : "in-progress";
    const progress = Math.max(2.8, (completedLevels / Math.max(LEVELS.length, 1)) * 100);
    return {
      kind,
      title: "Kanji",
      char: "語",
      status,
      progress,
      copy: `${completedLevels} of ${LEVELS.length} levels completed`,
    };
  }

  const levels = kind === "hiragana" ? HIRAGANA_LEVELS : KATAKANA_LEVELS;
  const completedLevels = levels.filter((lvl) => countCompletedInKanaLevel(lvl) >= lvl.items.length).length;
  const status =
    completedLevels === 0 ? "not-started" : completedLevels === levels.length ? "completed" : "in-progress";
  const progress = Math.max(2.8, (completedLevels / Math.max(levels.length, 1)) * 100);
  return {
    kind,
    title: kind === "hiragana" ? "Hiragana" : "Katakana",
    char: kind === "hiragana" ? "あ" : "ア",
    status,
    progress,
    copy: `${completedLevels} of ${levels.length} levels completed`,
  };
}

function ContentTrackCard({ card, onOpen }) {
  return (
    <article className="content-track-card">
      <DirectoryArtwork kind={card.kind} className="content-track-thumb" />
      <div className="content-track-main">
        <div className="content-track-title-row">
          <div className="content-track-title-wrap">
            <span className="content-track-char">{card.char}</span>
            <h3>{card.title}</h3>
          </div>
          <TrackStatusPill status={card.status} />
        </div>
        <div className="level-progress-track">
          <div className="level-progress-fill" style={{ width: `${card.progress}%` }} />
        </div>
        <p className="level-count">{card.copy}</p>
        <button className="level-open-btn" onClick={onOpen}>
          See levels
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}

function AllContentLevelsView({ onOpenTrack }) {
  const cards = ["hiragana", "katakana", "kanji"].map(computeTrackCard);
  return (
    <section className="levels-screen">
      <header className="levels-header">
        <CardStatsIcon />
        <h2>Study - All content</h2>
      </header>
      <div className="content-track-list">
        {cards.map((card) => (
          <ContentTrackCard key={card.kind} card={card} onOpen={() => onOpenTrack(card.kind)} />
        ))}
      </div>
    </section>
  );
}

function KanaLevelsView({ kind, user, onOpenLevel, onToggleLevelCompleted, onUnlock }) {
  const levels = kind === "hiragana" ? HIRAGANA_LEVELS : KATAKANA_LEVELS;
  const title = kind === "hiragana" ? "Hiragana Levels" : "Katakana Levels";
  return (
    <section className="levels-screen">
      <header className="levels-header">
        <CardStatsIcon />
        <h2>{title}</h2>
      </header>
      <div className="levels-list">
        {levels.map((lvl) => {
          const locked = !isKanaLevelUnlocked(lvl.level, user);
          const completed = countCompletedInKanaLevel(lvl);
          const status =
            completed === 0 ? "not-started" : completed === lvl.items.length ? "completed" : "in-progress";
          const progress = Math.max(2.8, (completed / Math.max(lvl.items.length, 1)) * 100);
          return (
            <article className="level-card" key={`${kind}-${lvl.level}`}>
              <div className={`level-card-content ${locked ? "is-locked" : ""}`}>
                <div className="level-card-title">
                  <h3>Level {lvl.level}</h3>
                  <TrackStatusPill status={status} locked={locked && status === "not-started"} />
                </div>
                <label className="practice-level-checkbox">
                  <input
                    type="checkbox"
                    checked={completed >= lvl.items.length}
                    disabled={locked}
                    onChange={(e) => onToggleLevelCompleted(lvl, e.target.checked)}
                  />
                  <span>Mark this level as ready to practice</span>
                </label>
                <div className="level-progress-track">
                  <div className="level-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="level-count">
                  {completed} of {lvl.items.length} kanas completed
                </p>
                <p className="level-summary">{lvl.summary}</p>
                {locked ? (
                  <button className="level-open-btn level-lock-btn" onClick={onUnlock}>
                    Unlock full app
                    <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <button className="level-open-btn" onClick={() => onOpenLevel(lvl.level)}>
                    See level content
                    <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function KanaLevelDetailView({ level, onBack, onSelectKana }) {
  if (!level) return null;
  const completedCount = countCompletedInKanaLevel(level);
  const levelProgress = (completedCount / Math.max(level.items.length, 1)) * 100;

  return (
    <section className="level-detail-screen">
      <div className="level-detail-top">
        <div className="levels-header">
          <CardStatsIcon />
          <h2>Level {level.level}</h2>
        </div>
        <button className="level-back-btn" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Go back
        </button>
      </div>

      <p className="level-detail-summary">{level.summary}</p>
      <div className="level-detail-progress">
        <div className="level-progress-track">
          <div className="level-progress-fill" style={{ width: `${Math.max(2.8, levelProgress)}%` }} />
        </div>
        <p className="level-count">
          {completedCount} of {level.items.length} kanjis completed
        </p>
      </div>

      <div className="level-detail-list">
        {level.items.map((item, index) => {
          const status = progressStatusFor(level.kind, item.id);
          return (
            <article className="kanji-list-card" key={`${level.kind}-${item.id}`}>
              <div className="kanji-list-char-wrap">
                <span className="kanji-list-char">{item.char}</span>
              </div>
              <div className="kanji-list-content">
                <div className="kanji-list-meta">
                  <TrackStatusPill status={status} />
                  <span className="kanji-level-meta">Lv. {level.level}</span>
                </div>
                <p className="kanji-list-meaning">
                  <strong>Meaning:</strong> {item.meaning}
                </p>
                <button className="kanji-list-btn" onClick={() => onSelectKana(item, index)}>
                  Study Kana
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function KanaStudyView({ detail, onBack, onPrev, onNext, onPractice, onToggleCompleted }) {
  const [tipOpen, setTipOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setVocabOpen(false);
  }, [detail?.item?.id, detail?.item?.romaji, detail?.kind]);

  if (!detail) return null;
  const mnemonic = getKanaMnemonic(detail.kind, detail.item.char, detail.item.romaji);
  const mnemonicImage = getKanaMnemonicImage(detail.kind, detail.item.romaji, detail.item.char);
  const imageSourceMeta = getKanaImageSourceMeta(detail.kind, detail.item.char);
  const vocabularyExamples = getKanaVocabularyExamples(detail.kind, detail.item.char);

  return (
    <section className="kanji-study-screen">
      <div className="level-detail-top">
        <div className="levels-header">
          <CardStatsIcon />
          <h2>Level {detail.level.level}</h2>
        </div>
        <button className="level-back-btn" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Go back
        </button>
      </div>
      <p className="kanji-study-index">
        Kana {detail.index + 1} of {detail.level.items.length}
      </p>
      <article className="kanji-lesson-card">
        <div className="kana-mnemonic-banner">
          {mnemonic}
        </div>
        <div className="kanji-lesson-top">
          <div className="kanji-lesson-char-box">
            <span className="kanji-lesson-char">{detail.item.char}</span>
          </div>
          <div className="kana-illustration-box">
            {mnemonicImage && !imageFailed ? (
              <img
                key={`${detail.kind}-${detail.item.id}-${detail.item.romaji}`}
                className="kana-illustration-image"
                src={mnemonicImage}
                alt={
                  imageSourceMeta
                    ? `${detail.item.char} combination kana reference chart`
                    : `${detail.item.char} mnemonic illustration`
                }
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <p key={`${detail.kind}-${detail.item.id}-mnemonic-copy`}>{mnemonic}</p>
            )}
          </div>
        </div>
        {imageSourceMeta ? (
          <p className="kana-illustration-credit">
            Reference chart:{" "}
            <a href={imageSourceMeta.pageUrl} target="_blank" rel="noreferrer">
              {imageSourceMeta.title}
            </a>
            {" "}by {imageSourceMeta.author} ({imageSourceMeta.license})
          </p>
        ) : null}
        <p className="kana-meaning-line">Meaning of the kana: {detail.item.meaning}</p>
        <div className={`study-accordion ${vocabOpen ? "is-open" : ""}`}>
          <button className="study-accordion-btn study-accordion-flat" onClick={() => setVocabOpen((open) => !open)}>
            <strong>Vocabulary examples</strong>
            <span aria-hidden="true">{vocabOpen ? "−" : "+"}</span>
          </button>
          {vocabOpen ? (
            <div className="study-accordion-body">
              <ul>
                {vocabularyExamples.length ? (
                  vocabularyExamples.map((example) => (
                    <li key={example.id || `${example.word}-${example.reading}`}>
                      {example.word} ({example.reading}) - {example.meaning}
                    </li>
                  ))
                ) : (
                  <li>No vocabulary examples found yet for this kana.</li>
                )}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="study-complete-row">
          <label className="study-complete-label">
            <input type="checkbox" checked={detail.isCompleted} onChange={(e) => onToggleCompleted(e.target.checked)} />
            <span>Mark as completed</span>
          </label>
          <div
            className="study-tip-wrap"
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
          >
            <button
              className="study-tip-btn"
              type="button"
              aria-label="Show completion help"
              onFocus={() => setTipOpen(true)}
              onBlur={() => setTipOpen(false)}
            >
              i
            </button>
            {tipOpen ? (
              <div className="study-tip">
                If you mark it as “completed” the app will start showing you this lesson in the practice section.
              </div>
            ) : null}
          </div>
        </div>
      </article>
      <div className="study-cta-row">
        <button className="study-nav-btn" onClick={onPrev} disabled={!onPrev} aria-label="Previous kana">
          ←
        </button>
        <button className="study-practice-btn" onClick={onPractice}>
          Practice this kana
        </button>
        <button className="study-nav-btn" onClick={onNext} disabled={!onNext} aria-label="Next kana">
          →
        </button>
      </div>
    </section>
  );
}

function ProgressTrackToggle({ track, onTrackChange }) {
  return (
    <div className="progress-track-toggle">
      <button className={track === "kanji" ? "is-active" : ""} onClick={() => onTrackChange("kanji")}>
        Kanji
      </button>
      <button className={track === "hiragana" ? "is-active" : ""} onClick={() => onTrackChange("hiragana")}>
        Hiragana
      </button>
      <button className={track === "katakana" ? "is-active" : ""} onClick={() => onTrackChange("katakana")}>
        Katakana
      </button>
    </div>
  );
}

function ProgressView({ stats, onSelectKanji, onStartPractice, track, onTrackChange }) {
  if (!stats) return <p>Loading...</p>;

  const [levelFilter, setLevelFilter] = useState("all");
  const [freqFilter, setFreqFilter] = useState("all");
  const [jlptFilter, setJlptFilter] = useState("all");
  const [meaningFilter, setMeaningFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const cards = useMemo(() => {
    const map = getProgressMap();
    return Object.entries(map)
      .filter(([key]) => key.startsWith("kanji:"))
      .map(([key, value]) => {
        const id = Number(key.split(":")[1]);
        const kanji = KANJI.find((item) => item.id === id);
        if (!kanji) return null;
        const level = KANJI_LEVEL_MAP.get(id) || 1;
        const status = isGuruOrAbove(value.stage) ? "completed" : "in-progress";
        const attempts = (value.correct || 0) + (value.incorrect || 0);
        const accuracy = attempts ? Math.round(((value.correct || 0) / attempts) * 100) : 0;
        return {
          id,
          kanji,
          level,
          status,
          attempts,
          mistakes: value.incorrect || 0,
          streak: Math.max(0, (value.correct || 0) - (value.incorrect || 0)),
          minutes: Math.max(1, attempts * 2),
          accuracy,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const statusRank = { "in-progress": 0, completed: 1 };
        const statusGap = statusRank[a.status] - statusRank[b.status];
        if (statusGap !== 0) return statusGap;
        if (a.level !== b.level) return a.level - b.level;
        return a.id - b.id;
      });
  }, [stats]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const levelOk = levelFilter === "all" ? true : difficultyByLevel(card.id) === levelFilter;
      const jlptOk =
        jlptFilter === "all" ? true : card.kanji.jlpt != null && String(card.kanji.jlpt) === jlptFilter;
      const meaningOk =
        !meaningFilter.trim() ||
        String(card.kanji.meaning || "").toLowerCase().includes(meaningFilter.trim().toLowerCase());
      let freqOk = true;
      if (freqFilter === "high") freqOk = card.kanji.frequency != null && card.kanji.frequency <= 1000;
      if (freqFilter === "medium")
        freqOk = card.kanji.frequency != null && card.kanji.frequency > 1000 && card.kanji.frequency <= 3000;
      if (freqFilter === "low") freqOk = card.kanji.frequency != null && card.kanji.frequency > 3000;
      if (freqFilter === "unknown") freqOk = card.kanji.frequency == null;
      return levelOk && jlptOk && freqOk && meaningOk;
    });
  }, [cards, levelFilter, jlptFilter, freqFilter, meaningFilter]);

  const practicedLevelCount = useMemo(
    () => new Set(cards.map((card) => card.level)).size,
    [cards]
  );

  const practicedKanaCount = useMemo(() => {
    const symbols = new Set();
    cards.forEach((card) => {
      READINGS.filter((r) => r.kanjiId === card.id).forEach((reading) => {
        Array.from(katakanaToHiragana(reading.reading || "")).forEach((ch) => {
          if (/[\u3040-\u309f]/.test(ch)) symbols.add(ch);
        });
      });
    });
    return symbols.size;
  }, [cards]);

  const totalMinutes = useMemo(
    () => cards.reduce((sum, card) => sum + card.minutes, 0),
    [cards]
  );

  useEffect(() => {
    if (!expandedId) return;
    if (filteredCards.some((card) => card.id === expandedId)) return;
    setExpandedId(null);
  }, [filteredCards, expandedId]);

  const filteredColumns = useMemo(() => splitIntoColumns(filteredCards, 4), [filteredCards]);

  return (
    <section className="progress-screen" data-node-id="23:3957">
      <header className="progress-header">
        <ProgressIcon />
        <h2>Progress</h2>
      </header>
      <ProgressTrackToggle track={track} onTrackChange={onTrackChange} />

      <p className="progress-practiced-inline">
        <strong>You&apos;ve practiced:</strong>{" "}
        <span>{cards.length} kanji</span>
        <span>{practicedLevelCount} Levels</span>
        <span>{practicedKanaCount} Kanas</span>
        <span>{totalMinutes} Minutes</span>
      </p>

      <div className="progress-filter-row">
        <label className="progress-select-wrap">
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="progress-select">
            <option value="all">Level</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <ExpandDownIcon />
        </label>
        <label className="progress-select-wrap">
          <select value={freqFilter} onChange={(e) => setFreqFilter(e.target.value)} className="progress-select">
            <option value="all">Frequency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
          <ExpandDownIcon />
        </label>
        <label className="progress-select-wrap">
          <select value={jlptFilter} onChange={(e) => setJlptFilter(e.target.value)} className="progress-select">
            <option value="all">JLPT</option>
            <option value="5">N5</option>
            <option value="4">N4</option>
            <option value="3">N3</option>
            <option value="2">N2</option>
            <option value="1">N1</option>
          </select>
          <ExpandDownIcon />
        </label>
      </div>

      <label className="progress-search-wrap">
        <span className="progress-search-icon" aria-hidden="true" />
        <input
          type="text"
          value={meaningFilter}
          onChange={(e) => setMeaningFilter(e.target.value)}
          className="progress-search-input"
          placeholder="Search specific kanji meaning"
        />
      </label>

      <div className="progress-list">
        {filteredCards.length ? (
          filteredColumns.map((column, columnIndex) => (
            <div className="progress-column" key={`kanji-column-${columnIndex}`}>
              {column.map((card) => {
                const isExpanded = expandedId === card.id;
                return (
                  <article className="progress-card" key={card.id}>
                    <div className="progress-card-char-wrap">
                      <span className="progress-card-char">{card.kanji.character}</span>
                    </div>
                    <div className="progress-card-content">
                      <div className="progress-card-meta">
                        <span className={`kanji-status-badge status-${card.status}`}>
                          {card.status === "in-progress" ? "In progress" : "Completed"}
                        </span>
                        <span className="kanji-level-meta">Lv. {card.level}</span>
                      </div>
                      <p className="progress-card-line">
                        <strong>Meaning:</strong> {toSentenceCase(String(card.kanji.meaning || "").split(",")[0])}
                      </p>
                      <p className="progress-card-line">
                        <strong>Overall accuracy:</strong> {card.accuracy}%
                      </p>
                      <div className={`progress-accordion-block ${isExpanded ? "is-expanded" : ""}`}>
                        <button
                          className={`progress-accordion ${isExpanded ? "is-expanded" : ""}`}
                          onClick={() => setExpandedId((current) => (current === card.id ? null : card.id))}
                        >
                          <span>Detailed progress</span>
                          <span className={`progress-accordion-icon ${isExpanded ? "is-expanded" : ""}`} aria-hidden="true">
                            {isExpanded ? "−" : "+"}
                          </span>
                        </button>
                        {isExpanded ? (
                          <ul className="progress-detail-list">
                            <li>
                              <strong>Attempts:</strong> {card.attempts}
                            </li>
                            <li>
                              <strong>Mistakes:</strong> {card.mistakes}
                            </li>
                            <li>
                              <strong>Streak:</strong> {card.streak}
                            </li>
                            <li>
                              <strong>Time studied:</strong> {card.minutes}mins
                            </li>
                          </ul>
                        ) : null}
                      </div>
                      <div className="progress-card-actions">
                        <button className="progress-study-btn" onClick={() => onSelectKanji(card.id)}>
                          Study
                          <span aria-hidden="true">→</span>
                        </button>
                        <button className="progress-practice-btn" onClick={() => onStartPractice(card.id)}>
                          Practice
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ))
        ) : (
          <p className="all-kanji-empty">No practiced kanji match the selected filters.</p>
        )}
      </div>
    </section>
  );
}

function ProgressKanaView({ kind, onStartPractice, track, onTrackChange }) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const items = kind === "hiragana" ? HIRAGANA_ITEMS : KATAKANA_ITEMS;

  const cards = useMemo(
    () =>
      items
        .map((item) => {
          const progress = getProgress(kind, item.id);
          if (!progress) return null;
          const status = progressStatusFor(kind, item.id);
          const attempts = (progress.correct || 0) + (progress.incorrect || 0);
          const accuracy = attempts ? Math.round(((progress.correct || 0) / attempts) * 100) : 0;
          const group = Math.floor(item.index / KANA_LEVEL_SIZE) + 1;
          return {
            item,
            status,
            attempts,
            accuracy,
            level: group,
            mistakes: progress.incorrect || 0,
            streak: Math.max(0, (progress.correct || 0) - (progress.incorrect || 0)),
            minutes: Math.max(1, attempts * 2),
          };
        })
        .filter(Boolean),
    [kind, items]
  );

  const filtered = cards.filter((card) => {
    const groupOk = groupFilter === "all" ? true : String(card.level) === groupFilter;
    const query = search.trim().toLowerCase();
    const searchOk =
      !query || card.item.char.includes(query) || card.item.romaji.toLowerCase().includes(query);
    return groupOk && searchOk;
  });

  const practicedLevelCount = new Set(cards.map((card) => card.level)).size;
  const totalMinutes = cards.reduce((sum, card) => sum + Math.max(1, card.attempts * 2), 0);

  useEffect(() => {
    if (!expandedId) return;
    if (filtered.some((card) => card.item.id === expandedId)) return;
    setExpandedId(null);
  }, [filtered, expandedId]);

  const filteredColumns = useMemo(() => splitIntoColumns(filtered, 4), [filtered]);

  return (
    <section className="progress-screen">
      <header className="progress-header">
        <ProgressIcon />
        <h2>Progress</h2>
      </header>
      <ProgressTrackToggle track={track} onTrackChange={onTrackChange} />
      <p className="progress-practiced-inline">
        <strong>You&apos;ve practiced:</strong>
        <span>{practicedLevelCount} Levels</span>
        <span>{cards.length} Kanas</span>
        <span>{totalMinutes} Minutes</span>
      </p>
      <div className="progress-filter-row">
        <label className="progress-select-wrap">
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="progress-select">
            <option value="all">Letter group</option>
            {Array.from(new Set(items.map((item) => Math.floor(item.index / KANA_LEVEL_SIZE) + 1))).map((g) => (
              <option key={g} value={String(g)}>
                Group {g}
              </option>
            ))}
          </select>
          <ExpandDownIcon />
        </label>
        <label className="progress-select-wrap">
          <select className="progress-select" defaultValue="all">
            <option value="all">Combination</option>
            <option value="single">Single</option>
            <option value="digraph">Digraph</option>
          </select>
          <ExpandDownIcon />
        </label>
      </div>
      <label className="progress-search-wrap">
        <span className="progress-search-icon" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="progress-search-input"
          placeholder="Search specific kana"
        />
      </label>
      <div className="progress-list">
        {filtered.length ? (
          filteredColumns.map((column, columnIndex) => (
            <div className="progress-column" key={`${kind}-column-${columnIndex}`}>
              {column.map((card) => {
                const isExpanded = expandedId === card.item.id;
                return (
                  <article className="progress-card" key={`${kind}-${card.item.id}`}>
                    <div className="progress-card-char-wrap">
                      <span className="progress-card-char">{card.item.char}</span>
                    </div>
                    <div className="progress-card-content">
                      <div className="progress-card-meta">
                        <TrackStatusPill status={card.status} />
                        <span className="kanji-level-meta">Lv. {card.level}</span>
                      </div>
                      <p className="progress-card-line">
                        <strong>Meaning:</strong> {card.item.meaning}
                      </p>
                      <p className="progress-card-line">
                        <strong>Overall accuracy:</strong> {card.accuracy}%
                      </p>
                      <div className={`progress-accordion-block ${isExpanded ? "is-expanded" : ""}`}>
                        <button
                          className={`progress-accordion ${isExpanded ? "is-expanded" : ""}`}
                          onClick={() => setExpandedId((current) => (current === card.item.id ? null : card.item.id))}
                        >
                          <span>Detailed progress</span>
                          <span className={`progress-accordion-icon ${isExpanded ? "is-expanded" : ""}`} aria-hidden="true">
                            {isExpanded ? "−" : "+"}
                          </span>
                        </button>
                        {isExpanded ? (
                          <ul className="progress-detail-list">
                            <li>
                              <strong>Attempts:</strong> {card.attempts}
                            </li>
                            <li>
                              <strong>Mistakes:</strong> {card.mistakes}
                            </li>
                            <li>
                              <strong>Streak:</strong> {card.streak}
                            </li>
                            <li>
                              <strong>Time studied:</strong> {card.minutes}mins
                            </li>
                          </ul>
                        ) : null}
                      </div>
                      <div className="progress-card-actions">
                        <button className="progress-study-btn" onClick={() => onStartPractice(card.item)}>
                          Study
                          <span aria-hidden="true">→</span>
                        </button>
                        <button className="progress-practice-btn" onClick={() => onStartPractice(card.item)}>
                          Practice
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ))
        ) : (
          <p className="all-kanji-empty">No practiced kana match the selected filters.</p>
        )}
      </div>
    </section>
  );
}

function ProgressHubView({ track, onTrackChange, stats, onSelectKanji, onStartKanjiPractice, onStartKanaPractice }) {
  return (
    <section className="progress-hub-screen">
      {track === "kanji" ? (
        <ProgressView
          stats={stats}
          onSelectKanji={onSelectKanji}
          onStartPractice={onStartKanjiPractice}
          track={track}
          onTrackChange={onTrackChange}
        />
      ) : (
        <ProgressKanaView
          kind={track}
          onStartPractice={onStartKanaPractice}
          track={track}
          onTrackChange={onTrackChange}
        />
      )}
    </section>
  );
}

function LevelsView({ levels, user, onSelectLevel, onToggleLevelCompleted, onUnlock }) {
  function levelStatus(levelItems) {
    const learned = countLearnedInLevel(levelItems);
    if (learned === 0) return "Not started";
    if (learned >= levelItems.length) return "Completed";
    return "In progress";
  }

  return (
    <section className="levels-screen" data-node-id="19:882">
      <header className="levels-header" data-node-id="19:885">
        <CardStatsIcon />
        <h2>Kanji Levels</h2>
      </header>
      <div className="levels-list">
        {levels.map((lvl) => {
          const locked = !isKanjiLevelUnlocked(lvl.level, user);
          return (
            <article className="level-card" key={lvl.level} data-node-id="2:69">
              <div className={`level-card-content ${locked ? "is-locked" : ""}`} data-node-id="2:64">
                <div className="level-card-title" data-node-id="2:63">
                  <div className="level-card-title-main">
                    <AtomIcon />
                    <h3>Level {lvl.level}</h3>
                  </div>
                  <TrackStatusPill
                    status={
                      countLearnedInLevel(lvl.items) === 0
                        ? "not-started"
                        : countLearnedInLevel(lvl.items) >= lvl.items.length
                        ? "completed"
                        : "in-progress"
                    }
                    locked={locked && countLearnedInLevel(lvl.items) === 0}
                  />
                </div>
                <label className="practice-level-checkbox">
                  <input
                    type="checkbox"
                    checked={countLearnedInLevel(lvl.items) >= lvl.items.length}
                    disabled={locked}
                    onChange={(e) => onToggleLevelCompleted(lvl, e.target.checked)}
                  />
                  <span>Mark this level as ready to practice</span>
                </label>
                <div className="level-progress-track" data-node-id="2:65">
                  <div
                    className="level-progress-fill"
                    style={{
                      width: `${Math.max(
                        2.8,
                        (countLearnedInLevel(lvl.items) / Math.max(lvl.items.length, 1)) * 100
                      )}%`,
                    }}
                    data-node-id="2:66"
                  />
                </div>
                <p className="level-count">
                  {countLearnedInLevel(lvl.items)} of {lvl.items.length} kanji completed
                </p>
                <p className="level-summary">{levelSummary(lvl.items)}</p>
                {locked ? (
                  <button className="level-open-btn level-lock-btn" onClick={onUnlock}>
                    Unlock full app
                    <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <button className="level-open-btn" onClick={() => onSelectLevel(lvl.level)}>
                    See level content
                    <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LevelDetailView({ level, onBack, onSelectKanji }) {
  if (!level) return null;
  const completedCount = countLearnedInLevel(level.items);
  const levelProgress = (completedCount / Math.max(level.items.length, 1)) * 100;

  function itemStatus(kanjiId) {
    const progress = getProgress("kanji", kanjiId);
    if (!progress) return "Not started";
    if (isGuruOrAbove(progress.stage)) return "Completed";
    return "In progress";
  }

  return (
    <section className="level-detail-screen" data-node-id="20:2123">
      <div className="level-detail-top">
        <div className="levels-header">
          <CardStatsIcon />
          <h2>Level {level.level}</h2>
        </div>
        <button className="level-back-btn" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Go back
        </button>
      </div>

      <p className="level-detail-summary">{levelSummary(level.items)}</p>

      <div className="level-detail-progress">
        <div className="level-progress-track">
          <div className="level-progress-fill" style={{ width: `${Math.max(2.8, levelProgress)}%` }} />
        </div>
        <p className="level-count">
          {completedCount} of {level.items.length} kanjis completed
        </p>
      </div>

      <div className="level-detail-list">
        {level.items.map((k, index) => {
          const status = itemStatus(k.id);
          return (
            <article className="kanji-list-card" key={k.id}>
              <div className="kanji-list-char-wrap">
                <span className="kanji-list-char">{k.character}</span>
              </div>
              <div className="kanji-list-content">
                <div className="kanji-list-meta">
                  <span className={`kanji-status-badge status-${status.toLowerCase().replace(" ", "-")}`}>
                    {status}
                  </span>
                  <span className="kanji-level-meta">Lv. {level.level}</span>
                </div>
                <p className="kanji-list-meaning">
                  <strong>Meaning:</strong> {k.meaning}
                </p>
                <button className="kanji-list-btn" onClick={() => onSelectKanji(k.id, index)}>
                  Study Kanji
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getKanjiStatus(kanjiId) {
  const progress = getProgress("kanji", kanjiId);
  if (!progress) return "not-started";
  if (isGuruOrAbove(progress.stage)) return "completed";
  return "in-progress";
}

function toSentenceCase(text) {
  const raw = String(text || "").trim();
  if (!raw) return "N/A";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function KanjiListView({
  items,
  onSelect,
  levelFilter,
  jlptFilter,
  freqFilter,
  meaningFilter,
  onFilterChange,
}) {
  return (
    <section className="all-kanji-screen" data-node-id="19:1085">
      <header className="all-kanji-header" data-node-id="19:1088">
        <span className="all-kanji-title-icon" aria-hidden="true">
          語
        </span>
        <h2>All Kanji</h2>
      </header>

      <div className="all-kanji-filter-row" data-node-id="19:1193">
        <label className="all-kanji-select-wrap">
          <select value={levelFilter} onChange={(e) => onFilterChange({ level: e.target.value })} className="all-kanji-select">
            <option value="all">Level</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <ExpandDownIcon />
        </label>
        <label className="all-kanji-select-wrap">
          <select
            value={freqFilter}
            onChange={(e) => onFilterChange({ freq: e.target.value })}
            className="all-kanji-select"
          >
            <option value="all">Frequency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
          <ExpandDownIcon />
        </label>
        <label className="all-kanji-select-wrap">
          <select
            value={jlptFilter}
            onChange={(e) => onFilterChange({ jlpt: e.target.value })}
            className="all-kanji-select"
          >
            <option value="all">JLPT</option>
            <option value="5">N5</option>
            <option value="4">N4</option>
            <option value="3">N3</option>
            <option value="2">N2</option>
            <option value="1">N1</option>
          </select>
          <ExpandDownIcon />
        </label>
      </div>

      <label className="all-kanji-search-wrap">
        <span className="all-kanji-search-icon" aria-hidden="true" />
        <input
          type="text"
          value={meaningFilter}
          onChange={(e) => onFilterChange({ query: e.target.value })}
          className="all-kanji-search-input"
          placeholder="Search specific kanji meaning"
        />
      </label>

      <div className="all-kanji-difficulty-row" data-node-id="20:1954">
        <p>Difficulty color explanation:</p>
        <span className="all-kanji-difficulty-chip chip-low">Low</span>
        <span className="all-kanji-difficulty-chip chip-medium">Medium</span>
        <span className="all-kanji-difficulty-chip chip-hard">Hard</span>
      </div>

      <div className="all-kanji-list" data-node-id="19:1091">
        {items.length ? (
          items.map((k) => {
            const level = KANJI_LEVEL_MAP.get(k.id) || 1;
            const status = getKanjiStatus(k.id);
            const difficulty = difficultyByLevel(k.id);
            const meaning = toSentenceCase(String(k.meaning || "").split(",")[0]);

            return (
              <article className="all-kanji-card" key={k.id} data-node-id="16:476">
                <div className="all-kanji-card-char-wrap">
                  <span className={`all-kanji-difficulty-dot dot-${difficulty}`} aria-hidden="true" />
                  <span className="all-kanji-card-char">{k.character}</span>
                </div>
                <div className="all-kanji-card-content">
                  <div className="all-kanji-card-meta">
                    <span className={`all-kanji-status-pill status-${status}`}>
                      {status === "not-started"
                        ? "Not started"
                        : status === "in-progress"
                        ? "In progress"
                        : "Completed"}
                    </span>
                    <span className="all-kanji-card-level">Lv. {level}</span>
                  </div>
                  <p className="all-kanji-card-meaning">
                    <strong>Meaning:</strong> {meaning}
                  </p>
                  <button className="all-kanji-study-btn" onClick={() => onSelect(k.id)}>
                    Study Kanji
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <p className="all-kanji-empty">No kanji found with the selected filters.</p>
        )}
      </div>
    </section>
  );
}

function KanjiDetailView({ detail, onBack, onPrev, onNext, onPractice, onToggleCompleted }) {
  const [vocabOpen, setVocabOpen] = useState(false);
  const [generalOpen, setGeneralOpen] = useState(false);
  const [onKunUseOpen, setOnKunUseOpen] = useState(false);
  const [radicalUseOpen, setRadicalUseOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    setVocabOpen(false);
    setGeneralOpen(false);
    setOnKunUseOpen(false);
    setRadicalUseOpen(false);
    setTipOpen(false);
  }, [detail?.kanji?.id]);

  if (!detail) return null;
  const { kanji, readings, radicals, vocab, levelNumber, kanjiIndex, totalKanjiInLevel, isCompleted } = detail;
  const onReadings = readings.filter((r) => r.type === "on").map((r) => r.reading);
  const kunReadings = readings.filter((r) => r.type === "kun").map((r) => r.reading);
  const frequencyOfUse =
    kanji.frequency == null ? "N/A" : kanji.frequency <= 1000 ? "High" : kanji.frequency <= 3000 ? "Medium" : "Low";
  const primaryRadicalMeaning = radicals[0]?.meaning ? String(radicals[0].meaning).split(",")[0].trim() : "N/A";
  const selfRadicals = RADICALS.filter((r) => r.symbol === kanji.character);
  const isKanjiAlsoRadical = selfRadicals.length > 0;
  const usedAsRadicalExamples = isKanjiAlsoRadical
    ? KANJI_RADICALS.filter((kr) => selfRadicals.some((sr) => sr.id === kr.radicalId) && kr.kanjiId !== kanji.id)
        .map((kr) => KANJI.find((k) => k.id === kr.kanjiId))
        .filter(Boolean)
        .filter((k, i, arr) => arr.findIndex((x) => x.id === k.id) === i)
        .slice(0, 8)
    : [];
  const onUseExamples = vocab.filter((v) => classifyVocabUsage(v.word) === "on").slice(0, 3);
  const kunUseExamples = vocab.filter((v) => classifyVocabUsage(v.word) === "kun").slice(0, 3);

  return (
    <section className="kanji-study-screen" data-node-id="20:2776">
      <div className="level-detail-top">
        <div className="levels-header">
          <CardStatsIcon />
          <h2>Level {levelNumber}</h2>
        </div>
        <button className="level-back-btn" onClick={onBack}>
          <span aria-hidden="true">←</span>
          Go back
        </button>
      </div>

      <p className="kanji-study-index">
        Kanji {Math.min((kanjiIndex ?? 0) + 1, totalKanjiInLevel ?? 1)} of {totalKanjiInLevel ?? 1}
      </p>

      <article className="kanji-lesson-card">
        <div className="kanji-lesson-top">
          <div className="kanji-lesson-char-box">
            <span className="kanji-lesson-char">{kanji.character}</span>
          </div>
          <div className="kanji-lesson-meta">
            <div className="lesson-radical-pill lesson-radical-pill-full">
              <strong>{isKanjiAlsoRadical ? "Used as radical:" : "Radical:"}</strong>
              <span>
                {isKanjiAlsoRadical
                  ? `${kanji.character} - ${String(kanji.meaning).split(",")[0].trim()}`
                  : radicals[0]
                  ? `${radicals[0].symbol} - ${primaryRadicalMeaning}`
                  : "N/A"}
              </span>
            </div>
            <p className="lesson-meaning-line">
              <strong>Kanji meaning:</strong> {kanji.meaning}
            </p>
          </div>
        </div>

        <div className="lesson-readings">
          <h3>On and Kun Readings</h3>
          <div className="lesson-reading-columns">
            <ul>
              {(onReadings.length ? onReadings : ["N/A"]).map((reading, i) => (
                <li key={`on-${i}`}>
                  <strong>ON:</strong> {reading}
                </li>
              ))}
            </ul>
            <ul>
              {(kunReadings.length ? kunReadings : ["N/A"]).map((reading, i) => (
                <li key={`kun-${i}`}>
                  <strong>KUN:</strong> {reading}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="study-accordions">
          <div className={`study-accordion ${vocabOpen ? "is-open" : ""}`}>
            <button className="study-accordion-btn" onClick={() => setVocabOpen((v) => !v)}>
              <strong>Vocabulary examples</strong>
              <span aria-hidden="true">{vocabOpen ? "−" : "+"}</span>
            </button>
            {vocabOpen ? (
              <div className="study-accordion-body">
                <ul>
                  {vocab.slice(0, 8).map((v) => (
                    <li key={v.id}>
                      {v.word} ({v.reading}) — {v.meaning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className={`study-accordion ${generalOpen ? "is-open" : ""}`}>
            <button className="study-accordion-btn" onClick={() => setGeneralOpen((v) => !v)}>
              <strong>General information</strong>
              <span aria-hidden="true">{generalOpen ? "−" : "+"}</span>
            </button>
            {generalOpen ? (
              <div className="study-accordion-body">
                <ul>
                  <li>
                    <strong>Grade:</strong> {kanji.grade ?? "N/A"}
                  </li>
                  <li>
                    <strong>JLPT:</strong> {kanji.jlpt != null ? `N${kanji.jlpt}` : "N/A"}
                  </li>
                  <li>
                    <strong>Frequency of use:</strong> {frequencyOfUse}
                  </li>
                  <li>
                    <strong>Stroke count:</strong> {kanji.strokeCount ?? "N/A"}
                  </li>
                </ul>
              </div>
            ) : null}
          </div>

          <div className={`study-accordion ${onKunUseOpen ? "is-open" : ""}`}>
            <button className="study-accordion-btn" onClick={() => setOnKunUseOpen((v) => !v)}>
              <strong>When to use On vs Kun</strong>
              <span aria-hidden="true">{onKunUseOpen ? "−" : "+"}</span>
            </button>
            {onKunUseOpen ? (
              <div className="study-accordion-body">
                <ul>
                  <li>
                    <strong>On readings (on&apos;yomi):</strong> Usually used in compound words with two or more kanji.
                  </li>
                  {onUseExamples.length ? (
                    <li>
                      <strong>Examples:</strong>{" "}
                      {onUseExamples.map((item) => `${item.word} (${item.reading})`).join(", ")}
                    </li>
                  ) : (
                    <li>
                      <strong>Examples:</strong> No clear compound examples found yet for this kanji.
                    </li>
                  )}
                  <li>
                    <strong>Kun readings (kun&apos;yomi):</strong> Usually used for standalone kanji or with okurigana
                    (hiragana endings).
                  </li>
                  {kunUseExamples.length ? (
                    <li>
                      <strong>Examples:</strong>{" "}
                      {kunUseExamples.map((item) => `${item.word} (${item.reading})`).join(", ")}
                    </li>
                  ) : (
                    <li>
                      <strong>Examples:</strong> No clear okurigana/standalone examples found yet for this kanji.
                    </li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>

          {isKanjiAlsoRadical ? (
            <>
              <div className={`study-accordion ${radicalUseOpen ? "is-open" : ""}`}>
                <button className="study-accordion-btn" onClick={() => setRadicalUseOpen((v) => !v)}>
                  <strong>Used as radical examples</strong>
                  <span aria-hidden="true">{radicalUseOpen ? "−" : "+"}</span>
                </button>
                {radicalUseOpen ? (
                  <div className="study-accordion-body">
                    <ul>
                      {usedAsRadicalExamples.length ? (
                        usedAsRadicalExamples.map((item) => (
                          <li key={item.id}>
                            {item.character} — {item.meaning}
                          </li>
                        ))
                      ) : (
                        <li>No examples found yet.</li>
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="study-complete-row">
          <label className="study-complete-label">
            <input type="checkbox" checked={isCompleted} onChange={(e) => onToggleCompleted(e.target.checked)} />
            <span>Mark as completed</span>
          </label>
          <div
            className="study-tip-wrap"
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
          >
            <button
              className="study-tip-btn"
              type="button"
              aria-label="Show completion help"
              onFocus={() => setTipOpen(true)}
              onBlur={() => setTipOpen(false)}
            >
              i
            </button>
            {tipOpen ? (
              <div className="study-tip">
                If you mark it as “completed” the app will start showing you this lesson in the practice section.
              </div>
            ) : null}
          </div>
        </div>
      </article>

      <div className="study-cta-row">
        <button className="study-nav-btn" onClick={onPrev} aria-label="Previous kanji" disabled={!onPrev}>
          ←
        </button>
        <button className="study-practice-btn" onClick={onPractice}>
          Practice this kanji
        </button>
        <button className="study-nav-btn" onClick={onNext} aria-label="Next kanji" disabled={!onNext}>
          →
        </button>
      </div>
    </section>
  );
}

function LessonsView({ items, onComplete }) {
  const [index, setIndex] = useState(0);
  const current = items[index];

  useEffect(() => {
    setIndex(0);
  }, [items]);

  if (!items.length) return <p>No new lessons available.</p>;

  function next() {
    setIndex((i) => Math.min(i + 1, items.length - 1));
  }

  const isKanjiLesson = current.type === "kanji";
  const kanji = isKanjiLesson ? current.item : null;
  const readings = isKanjiLesson ? READINGS.filter((r) => r.kanjiId === kanji.id) : [];
  const onReadings = readings.filter((r) => r.type === "on").map((r) => r.reading);
  const kunReadings = readings.filter((r) => r.type === "kun").map((r) => r.reading);
  const radicals = isKanjiLesson
    ? KANJI_RADICALS.filter((kr) => kr.kanjiId === kanji.id)
        .map((kr) => RADICALS.find((r) => r.id === kr.radicalId))
        .filter(Boolean)
    : [];
  const vocabularyExamples = isKanjiLesson ? VOCAB.filter((v) => v.kanjiId === kanji.id).slice(0, 5) : [];
  const frequencyOfUse =
    !isKanjiLesson || kanji.frequency == null
      ? "N/A"
      : kanji.frequency <= 1000
      ? "High"
      : kanji.frequency <= 3000
      ? "Medium"
      : "Low";

  return (
    <section>
      <h2>Lessons</h2>
      <p>
        Item {index + 1} of {items.length}
      </p>
      <div className="lesson-view-card-wrap">
        {isKanjiLesson ? (
          <article className="lesson-kanji-card" data-node-id="2:104">
            <div className="lesson-kanji-header">
              <div className="lesson-kanji-char">{kanji.character}</div>
              <div className="lesson-radical-pill">
                <strong>Radical:</strong>
                <span>
                  {radicals[0] ? `${radicals[0].symbol} — ${radicals[0].meaning}` : "N/A"}
                </span>
              </div>
            </div>

            <p className="lesson-meaning-line">
              <strong>Meaning:</strong> {kanji.meaning}
            </p>

            <div className="lesson-readings">
              <h3>On and Kun Readings</h3>
              <div className="lesson-reading-columns">
                <ul>
                  {(onReadings.length ? onReadings : ["N/A"]).map((reading, i) => (
                    <li key={`on-${i}`}>
                      <strong>ON:</strong> {reading}
                    </li>
                  ))}
                </ul>
                <ul>
                  {(kunReadings.length ? kunReadings : ["N/A"]).map((reading, i) => (
                    <li key={`kun-${i}`}>
                      <strong>KUN:</strong> {reading}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <section className="lesson-info-card">
              <header>
                <h4>Vocabulary examples</h4>
                <span aria-hidden="true">−</span>
              </header>
              <ul>
                {(vocabularyExamples.length ? vocabularyExamples : []).map((v) => (
                  <li key={v.id}>
                    {v.word} ({v.reading}) — {v.meaning}
                  </li>
                ))}
                {!vocabularyExamples.length ? <li>No examples available yet.</li> : null}
              </ul>
            </section>

            <section className="lesson-info-card">
              <header>
                <h4>General information</h4>
                <span aria-hidden="true">−</span>
              </header>
              <ul>
                <li>
                  <strong>Grade:</strong> {kanji.grade ?? "N/A"}
                </li>
                <li>
                  <strong>JLPT:</strong> {kanji.jlpt != null ? `N${kanji.jlpt}` : "N/A"}
                </li>
                <li>
                  <strong>Frequency of use:</strong> {frequencyOfUse}
                </li>
                <li>
                  <strong>Stroke count:</strong> {kanji.strokeCount ?? "N/A"}
                </li>
              </ul>
            </section>
          </article>
        ) : (
          <div style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.85rem", color: "#555" }}>{current.type.toUpperCase()}</div>
            <div style={{ fontSize: "2rem", margin: "0.5rem 0" }}>
              {current.type === "radical" && current.item.symbol}
              {current.type === "vocab" && current.item.word}
            </div>
            <div>
              {current.type === "radical" && current.item.meaning}
              {current.type === "vocab" && `${current.item.meaning} (${current.item.reading})`}
            </div>
          </div>
        )}
        <div className="lesson-actions">
          <button onClick={() => onComplete(current)} style={{ marginRight: "0.5rem" }}>
            Mark Learned
          </button>
          <button onClick={next}>Next</button>
        </div>
      </div>
    </section>
  );
}

function PracticeMainView({ user, onStartPractice, onUnlock }) {
  const [levelFilter, setLevelFilter] = useState("all");
  const [jlptFilter, setJlptFilter] = useState("all");
  const [freqFilter, setFreqFilter] = useState("all");
  const [meaningFilter, setMeaningFilter] = useState("");
  const [selectedLevels, setSelectedLevels] = useState({});

  const levelCards = useMemo(
    () =>
      LEVELS.map((level) => {
        const completedItems = level.items.filter((k) => {
          const progress = getProgress("kanji", k.id);
          return progress && isGuruOrAbove(progress.stage);
        });
        return {
          ...level,
          locked: !isKanjiLevelUnlocked(level.level, user),
          completedItems,
          completedCount: completedItems.length,
        };
      }),
    [user]
  );

  const filteredCards = useMemo(
    () =>
      levelCards.filter((level) => {
        const filterSource = level.completedItems.length ? level.completedItems : level.items;
        const levelOk =
          levelFilter === "all" ? true : filterSource.some((k) => difficultyByLevel(k.id) === levelFilter);
        const jlptOk =
          jlptFilter === "all"
            ? true
            : filterSource.some((k) => k.jlpt != null && String(k.jlpt) === jlptFilter);
        let freqOk = true;
        if (freqFilter === "high") freqOk = filterSource.some((k) => k.frequency != null && k.frequency <= 1000);
        if (freqFilter === "medium")
          freqOk = filterSource.some((k) => k.frequency != null && k.frequency > 1000 && k.frequency <= 3000);
        if (freqFilter === "low") freqOk = filterSource.some((k) => k.frequency != null && k.frequency > 3000);
        if (freqFilter === "unknown") freqOk = filterSource.some((k) => k.frequency == null);
        const meaningOk =
          !meaningFilter.trim() ||
          filterSource.some((k) =>
            String(k.meaning || "")
              .toLowerCase()
              .includes(meaningFilter.trim().toLowerCase())
          );
        return levelOk && jlptOk && freqOk && meaningOk;
      }),
    [freqFilter, jlptFilter, levelCards, levelFilter, meaningFilter]
  );

  function toggleLevel(levelNumber, checked) {
    setSelectedLevels((prev) => ({ ...prev, [levelNumber]: checked }));
  }

  function startAllCompleted() {
    const selected = levelCards.filter((level) => selectedLevels[level.level] && !level.locked);
    const source = selected.length ? selected : levelCards.filter((level) => !level.locked);
    const completedIds = source.flatMap((level) => level.completedItems.map((item) => item.id));
    onStartPractice(buildPracticeItemsForKanjiIds(completedIds));
  }

  function startLevelPractice(level) {
    onStartPractice(buildPracticeItemsForKanjiIds(level.completedItems.map((item) => item.id)));
  }

  return (
    <section className="practice-screen" data-node-id="21:3288">
      <header className="practice-header" data-node-id="21:3573">
        <PracticeIcon />
        <h2>Practice</h2>
      </header>

      <div className="practice-filter-row">
        <label className="practice-select-wrap">
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="practice-select">
            <option value="all">Level</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <ExpandDownIcon />
        </label>
        <label className="practice-select-wrap">
          <select value={freqFilter} onChange={(e) => setFreqFilter(e.target.value)} className="practice-select">
            <option value="all">Frequency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
          <ExpandDownIcon />
        </label>
        <label className="practice-select-wrap">
          <select value={jlptFilter} onChange={(e) => setJlptFilter(e.target.value)} className="practice-select">
            <option value="all">JLPT</option>
            <option value="5">N5</option>
            <option value="4">N4</option>
            <option value="3">N3</option>
            <option value="2">N2</option>
            <option value="1">N1</option>
          </select>
          <ExpandDownIcon />
        </label>
      </div>

      <label className="practice-search-wrap">
        <span className="all-kanji-search-icon" aria-hidden="true" />
        <input
          type="text"
          value={meaningFilter}
          onChange={(e) => setMeaningFilter(e.target.value)}
          className="practice-search-input"
          placeholder="Search specific kanji meaning"
        />
      </label>

      <div className="practice-top-actions">
        <button className="practice-all-btn" onClick={startAllCompleted}>
          Practice all ready kanji
          <span aria-hidden="true">→</span>
        </button>

        {Object.values(selectedLevels).some(Boolean) ? (
          <button className="practice-all-btn practice-selected-btn" onClick={startAllCompleted}>
            Practice all selected levels
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>

      <div className="practice-level-list">
        {filteredCards.length ? (
          filteredCards.map((level) => {
            const progress = (level.completedCount / Math.max(level.items.length, 1)) * 100;
            const status =
              level.completedCount === 0
                ? "not-started"
                : level.completedCount >= level.items.length
                ? "completed"
                : "in-progress";
            return (
              <article className="practice-level-card" key={level.level} data-node-id="23:5549">
                <div className={`practice-level-content ${level.locked ? "is-locked" : ""}`}>
                  <div className="practice-level-title">
                    <div className="level-card-title-main">
                      <AtomIcon />
                      <h3>Level {level.level}</h3>
                    </div>
                    <TrackStatusPill status={status} locked={level.locked && status === "not-started"} />
                  </div>
                <div className="practice-progress-track">
                  <div className="practice-progress-fill" style={{ width: `${Math.max(0, progress)}%` }} />
                </div>
                <p className="practice-progress-copy">
                  {level.completedCount} of {level.items.length} kanji ready to practice
                </p>
                <p className="practice-level-summary">{practiceLevelSummary(level.level)}</p>
                <label className="practice-level-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedLevels[level.level])}
                    disabled={level.locked}
                    onChange={(e) => toggleLevel(level.level, e.target.checked)}
                  />
                  <span>Select to practice with more levels</span>
                </label>
                <button
                  className="practice-level-btn"
                  onClick={() => (level.locked ? onUnlock() : startLevelPractice(level))}
                  disabled={!level.locked && !level.completedCount}
                >
                  {level.locked ? "Unlock full app" : "Practice Kanji"}
                  <span aria-hidden="true">→</span>
                </button>
                </div>
              </article>
            );
          })
        ) : (
          <p className="all-kanji-empty">No levels match the selected filters.</p>
        )}
      </div>
    </section>
  );
}

function PracticeAllContentView({ onOpenTrack, user, onUnlock }) {
  const cards = ["hiragana", "katakana", "kanji"].map(computeTrackCard);
  return (
    <section className="practice-screen" data-node-id="58:5750">
      <header className="practice-header" data-node-id="58:5753">
        <PracticeIcon />
        <h2>Practice</h2>
      </header>
      <p className="practice-intro">
        <strong>Here comes the exciting part!</strong> Let&apos;s put your knowledge to the test. The app will only
        show kana and kanji you&apos;ve already studied and <strong>marked as ready to practice</strong>, so
        you&apos;re ready for this. You can practice as many times you want!
      </p>
      <div className="practice-main-list" data-node-id="63:6173">
        {cards.map((card) => (
          <article className="practice-main-card" key={`practice-${card.kind}`} data-node-id="63:6174">
            <DirectoryArtwork kind={card.kind} className="practice-main-thumb" />
            <div className="practice-main-content">
              <div className="practice-main-title-row">
                <div className="practice-main-title-wrap">
                  <span className="practice-main-char">{card.char}</span>
                  <h3>{card.title}</h3>
                </div>
                <span className={`kanji-status-badge status-${card.status}`}>{statusLabel(card.status)}</span>
              </div>
              <div className="level-progress-track">
                <div className="level-progress-fill" style={{ width: `${card.progress}%` }} />
              </div>
              <p className="practice-main-copy">{card.copy}</p>
              <button
                className="level-open-btn"
                onClick={() =>
                  card.kind === "kanji" || hasFullAccess(user) ? onOpenTrack(card.kind) : onOpenTrack(card.kind)
                }
              >
                See levels
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PracticeKanaLevelsView({ kind, user, onStartPractice, onUnlock }) {
  const [selectedLevels, setSelectedLevels] = useState({});
  const levels = kind === "hiragana" ? HIRAGANA_LEVELS : KATAKANA_LEVELS;
  const title = kind === "hiragana" ? "Practice Hiragana" : "Practice Katakana";
  const label = kind === "hiragana" ? "hiragana" : "katakana";

  function buildKanaPracticeItems(items) {
    return items.map((item) => ({
      type: "kana",
      kind,
      id: item.id,
      prompt: item.char,
      readings: [item.romaji],
      meanings: [item.meaning],
    }));
  }

  function toggleLevel(levelNumber, checked) {
    setSelectedLevels((prev) => ({ ...prev, [levelNumber]: checked }));
  }

  function startSelectedLevels() {
    const selected = levels.filter(
      (level) => selectedLevels[level.level] && isKanaLevelUnlocked(level.level, user)
    );
    const source = selected.length ? selected : levels.filter((level) => isKanaLevelUnlocked(level.level, user));
    const completedItems = source.flatMap((level) =>
      level.items.filter((item) => progressStatusFor(kind, item.id) === "completed")
    );
    onStartPractice(buildKanaPracticeItems(completedItems));
  }

  return (
    <section className="practice-screen">
      <header className="practice-header">
        <PracticeIcon />
        <h2>{title}</h2>
      </header>
      <div className="practice-top-actions">
        <button className="practice-all-btn" onClick={startSelectedLevels}>
          Practice all ready {label}
          <span aria-hidden="true">→</span>
        </button>
        {Object.values(selectedLevels).some(Boolean) ? (
          <button className="practice-all-btn practice-selected-btn" onClick={startSelectedLevels}>
            Practice all selected levels
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
      <div className="practice-level-list">
        {levels.map((level) => {
          const locked = !isKanaLevelUnlocked(level.level, user);
          const completedItems = level.items.filter((item) => progressStatusFor(kind, item.id) === "completed");
          const progress = (completedItems.length / Math.max(level.items.length, 1)) * 100;
          const status =
            completedItems.length === 0
              ? "not-started"
              : completedItems.length >= level.items.length
              ? "completed"
              : "in-progress";
          return (
            <article className="practice-level-card" key={`${kind}-${level.level}`}>
              <div className={`practice-level-content ${locked ? "is-locked" : ""}`}>
                <div className="practice-level-title">
                  <h3>Level {level.level}</h3>
                  <TrackStatusPill status={status} locked={locked && status === "not-started"} />
                </div>
                <div className="practice-progress-track">
                  <div className="practice-progress-fill" style={{ width: `${Math.max(0, progress)}%` }} />
                </div>
                <p className="practice-progress-copy">
                  {completedItems.length} of {level.items.length} kana ready to practice
                </p>
                <p className="practice-level-summary">{level.summary}</p>
                <label className="practice-level-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedLevels[level.level])}
                    disabled={locked}
                    onChange={(e) => toggleLevel(level.level, e.target.checked)}
                  />
                  <span>Select to practice with more levels</span>
                </label>
                <button
                  className="practice-level-btn"
                  disabled={!locked && !completedItems.length}
                  onClick={() => (locked ? onUnlock() : onStartPractice(buildKanaPracticeItems(completedItems)))}
                >
                  {locked ? "Unlock full app" : "Practice Kana"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PracticeSessionView({ items, onSubmit, onExit }) {
  const onInputRef = useRef(null);
  const [sessionItems, setSessionItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("idle");
  const [onInput, setOnInput] = useState("");
  const [kunInput, setKunInput] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [typingFeedback, setTypingFeedback] = useState(null);
  const [sessionResults, setSessionResults] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [advanceOnEnterReady, setAdvanceOnEnterReady] = useState(false);

  useEffect(() => {
    setSessionItems(shuffleItems(items));
    setIndex(0);
    setStatus("idle");
    setOnInput("");
    setKunInput("");
    setSelectedOption(null);
    setTypingFeedback(null);
    setSessionResults([]);
    setIsComplete(false);
    setAdvanceOnEnterReady(false);
  }, [items]);

  useEffect(() => {
    if (status === "idle" || isComplete) return undefined;

    function handleAdvanceArm(event) {
      if (event.key !== "Enter") return;
      setAdvanceOnEnterReady(true);
    }

    function handleAdvanceOnEnter(event) {
      if (event.key !== "Enter" || event.shiftKey || !advanceOnEnterReady) return;
      event.preventDefault();
      setAdvanceOnEnterReady(false);
      goNext();
    }

    window.addEventListener("keyup", handleAdvanceArm);
    window.addEventListener("keydown", handleAdvanceOnEnter);
    return () => {
      window.removeEventListener("keyup", handleAdvanceArm);
      window.removeEventListener("keydown", handleAdvanceOnEnter);
    };
  }, [status, isComplete, index, sessionItems.length, advanceOnEnterReady]);

  useEffect(() => {
    if (!sessionItems.length) return;
    const currentItem = sessionItems[index];
    if (!currentItem) return;
    const typingExercise = currentItem.type === "kana" || index % 3 === 0;
    if (!typingExercise || status !== "idle" || isComplete) return;
    onInputRef.current?.focus();
  }, [sessionItems, index, status, isComplete]);

  if (!sessionItems.length) {
    return (
      <section className="practice-session-screen">
        <header className="practice-header">
          <PracticeIcon />
          <h2>Practice</h2>
        </header>
        <p className="all-kanji-empty">No completed kanji selected for practice.</p>
      </section>
    );
  }

  const current = sessionItems[index];
  const isKanaPractice = current.type === "kana";
  const kanji = isKanaPractice ? null : KANJI.find((k) => k.id === current.id);
  const levelNumber = isKanaPractice ? 1 : findLevelForKanji(current.id)?.level || 1;
  const readings = isKanaPractice ? [] : READINGS.filter((r) => r.kanjiId === current.id);
  const onReadings = isKanaPractice ? [current.readings?.[0] || ""] : readings.filter((r) => r.type === "on").map((r) => r.reading);
  const kunReadings = isKanaPractice ? [] : readings.filter((r) => r.type === "kun").map((r) => r.reading);
  const exerciseType = isKanaPractice ? "typing" : ["typing", "selection-kana", "selection-kanji"][index % 3];

  const kanaCorrect = readingLabelInRomaji([...onReadings, ...kunReadings].filter(Boolean).length ? [...onReadings, ...kunReadings] : current.readings);
  const distractorKanji = KANJI.filter((k) => k.id !== current.id).slice((current.id * 17) % 200, (current.id * 17) % 200 + 6);
  const distractorReadingOptions = distractorKanji
    .map((item) => {
      const itemReadings = READINGS.filter((r) => r.kanjiId === item.id).map((r) => r.reading);
      return readingLabelInRomaji(itemReadings);
    })
    .filter((label) => label !== "N/A");
  const kanaOptions = [
    kanaCorrect,
    distractorReadingOptions[0] || "ryoku / tou / nin",
    distractorReadingOptions[1] || "san / nichi / kou",
  ];

  const selectionKanjiPrompt = readingLabelInRomaji(onReadings[0] || kunReadings[0] || current.readings?.[0] || "");
  const kanjiOptions = [
    kanji?.character || current.prompt,
    distractorKanji[0]?.character || "刀",
    distractorKanji[1]?.character || "力",
  ];
  const onReadingLabel = readingLabelInRomaji(onReadings[0] || current.readings?.[0] || "");
  const kunReadingLabel = readingLabelInRomaji(kunReadings[0] || "");
  const sessionLabel = (() => {
    const kinds = new Set(sessionItems.map((item) => (item.type === "kana" ? "kana" : "kanji")));
    if (kinds.size === 1) return kinds.has("kana") ? "kanas" : "kanji";
    return "items";
  })();
  const masteredCount = sessionResults.filter((result) => result.correct).length;
  const mistakesCount = sessionResults.length - masteredCount;
  const successfulItems = sessionResults.filter((result) => result.correct);
  const missedItems = sessionResults.filter((result) => !result.correct);

  function resultKeyFor(item) {
    return `${item.type}:${item.kind || ""}:${item.id}`;
  }

  function updateSessionResults(nextResult) {
    const key = resultKeyFor(nextResult.item);
    setSessionResults((prev) => {
      const remaining = prev.filter((entry) => resultKeyFor(entry.item) !== key);
      return [...remaining, nextResult];
    });
  }

  function buildResultSummary(correct) {
    if (exerciseType === "typing") {
      return {
        expected: isKanaPractice
          ? [onReadingLabel].filter(Boolean)
          : [onReadingLabel, kunReadingLabel].filter(Boolean),
        typed: isKanaPractice ? [onInput || "-"] : [onInput || "-", kunInput || "-"],
        exerciseType,
      };
    }

    const options = exerciseType === "selection-kana" ? kanaOptions : kanjiOptions;
    return {
      expected: [options[0]],
      typed: [selectedOption != null ? options[selectedOption] : "None"],
      exerciseType,
      correct,
    };
  }

  function resetCurrentCard() {
    setStatus("idle");
    setOnInput("");
    setKunInput("");
    setSelectedOption(null);
    setTypingFeedback(null);
    setAdvanceOnEnterReady(false);
  }

  function goNext() {
    if (index >= sessionItems.length - 1) {
      setIsComplete(true);
      return;
    }
    setIndex((i) => i + 1);
    resetCurrentCard();
  }

  function submitAnswer() {
    if (status !== "idle") return;
    let correct = false;

    if (exerciseType === "typing") {
      const expectedOn = onReadings[0] || "";
      const expectedKun = isKanaPractice ? "" : kunReadings[0] || "";
      const onExpectedForms = readingForms(expectedOn);
      const kunExpectedForms = readingForms(expectedKun);
      const onUser = canonicalRomaji(onInput);
      const kunUser = canonicalRomaji(kunInput);
      const onOk = expectedOn ? onExpectedForms.includes(onUser) : true;
      const kunOk = expectedKun ? kunExpectedForms.includes(kunUser) : true;
      correct = onOk && kunOk;
      setTypingFeedback({ onOk, kunOk });
    }

    if (exerciseType === "selection-kana" || exerciseType === "selection-kanji") {
      correct = selectedOption === 0;
    }

    setStatus(correct ? "correct" : "wrong");
    setAdvanceOnEnterReady(false);
    onSubmit(current, correct ? "correct" : "incorrect");
    updateSessionResults({
      item: current,
      prompt: current.prompt,
      levelNumber,
      correct,
      summary: buildResultSummary(correct),
    });
  }

  function handleEnterSubmit(event) {
    if (event.key !== "Enter" || event.shiftKey || status !== "idle") return;

    const target = event.currentTarget;
    const isTypingField = target.tagName === "INPUT";
    const isSelectedOption =
      target.tagName === "BUTTON" &&
      target.classList.contains("practice-option") &&
      selectedOption != null;

    if (!isTypingField && !isSelectedOption) return;

    event.preventDefault();
    submitAnswer();
  }

  function SelectionOption({ idx, value }) {
    const picked = selectedOption === idx;
    const active = picked;
    return (
      <button
        className={`practice-option ${active ? "is-active" : ""}`}
        onClick={() => (status === "idle" ? setSelectedOption(idx) : null)}
        onKeyDown={handleEnterSubmit}
      >
        <span className="practice-option-text">
          <strong>{String.fromCharCode(65 + idx)}.</strong> {value}
        </span>
        <span className={`practice-option-circle ${picked ? "is-checked" : ""}`} aria-hidden="true" />
      </button>
    );
  }

  if (isComplete) {
    return (
      <section className="practice-session-screen is-summary">
        <header className="practice-session-header">
          <div className="practice-header">
            <PracticeIcon />
            <h2>Practice</h2>
          </div>
          <button className="level-back-btn" onClick={onExit}>
            <span aria-hidden="true">←</span>
            Back to practice
          </button>
        </header>

        <article className="practice-summary-card">
          <div className="practice-summary-hero">
            <h3>Congrats! You mastered {masteredCount} {sessionLabel} in this lesson.</h3>
            <p>
              You practiced {sessionResults.length} {sessionLabel}. Keep an eye on the mistakes section so you know
              what to revisit next.
            </p>
          </div>

          <div className="practice-summary-stats">
            <div className="practice-summary-stat is-success">
              <strong>{masteredCount}</strong>
              <span>Successful items</span>
            </div>
            <div className="practice-summary-stat is-warning">
              <strong>{mistakesCount}</strong>
              <span>Items to review</span>
            </div>
          </div>

          <div className="practice-summary-sections">
            <section className="practice-summary-section">
              <h4>What went well</h4>
              {successfulItems.length ? (
                <div className="practice-summary-list">
                  {successfulItems.map((result) => (
                    <article className="practice-summary-item is-success" key={`${resultKeyFor(result.item)}:ok`}>
                      <div className="practice-summary-item-top">
                        <strong>{result.prompt}</strong>
                        <span>Level {result.levelNumber}</span>
                      </div>
                      <p>
                        <strong>Correct answer:</strong> {result.summary.expected.join(" / ")}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="practice-summary-empty">No correct answers yet in this session.</p>
              )}
            </section>

            <section className="practice-summary-section">
              <h4>Keep practicing</h4>
              {missedItems.length ? (
                <div className="practice-summary-list">
                  {missedItems.map((result) => (
                    <article className="practice-summary-item is-warning" key={`${resultKeyFor(result.item)}:miss`}>
                      <div className="practice-summary-item-top">
                        <strong>{result.prompt}</strong>
                        <span>Level {result.levelNumber}</span>
                      </div>
                      <p>
                        <strong>Correct answer:</strong> {result.summary.expected.join(" / ")}
                      </p>
                      <p>
                        <strong>Your answer:</strong> {result.summary.typed.join(" / ")}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="practice-summary-empty">No mistakes this time.</p>
              )}
            </section>
          </div>

          <div className="practice-summary-actions">
            <button
              className="practice-half-btn"
              onClick={() => {
                setSessionItems(shuffleItems(items));
                setIndex(0);
                setSessionResults([]);
                setIsComplete(false);
                resetCurrentCard();
              }}
            >
              Practice Again
              <span aria-hidden="true">↻</span>
            </button>
            <button className="practice-half-btn" onClick={onExit}>
              Back to Practice
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="practice-session-screen">
      <header className="practice-session-header">
        <div className="practice-header">
          <PracticeIcon />
          <h2>Practice</h2>
        </div>
        <button className="level-back-btn" onClick={onExit}>
          <span aria-hidden="true">←</span>
          Go back
        </button>
      </header>

      <p className="practice-session-meta">
        <strong>Practicing:</strong> Level {levelNumber}
      </p>

      <div className="practice-session-card-wrap">
        <article className="practice-question-card">
          <div className="practice-question-char-wrap">
            <span className={`practice-question-char ${exerciseType === "selection-kanji" ? "is-kana-prompt" : ""}`}>
              {exerciseType === "selection-kanji" ? selectionKanjiPrompt : current.prompt}
            </span>
          </div>

          <h3 className="practice-question-title">
            {isKanaPractice
              ? "Write the romaji for this kana"
              : exerciseType === "typing"
              ? "Type the On Reading in romaji"
              : exerciseType === "selection-kana"
              ? "Select the correct romaji reading"
              : "Select the correct kanji for this romaji"}
          </h3>

          {exerciseType === "typing" ? (
            <>
              {status === "idle" ? (
                <>
                  <input
                    ref={onInputRef}
                    className="practice-input"
                    type="text"
                    inputMode="text"
                    lang="en"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={isKanaPractice ? "Type romaji, e.g. a" : "Type romaji, e.g. kyu"}
                    value={onInput}
                    onChange={(e) => setOnInput(e.target.value)}
                    onKeyDown={handleEnterSubmit}
                  />
                  {!isKanaPractice ? (
                    <>
                      <h3 className="practice-question-title">Type the Kun Reading in romaji</h3>
                      <input
                        className="practice-input"
                        type="text"
                        inputMode="text"
                        lang="en"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Type romaji, e.g. kokonotsu"
                        value={kunInput}
                        onChange={(e) => setKunInput(e.target.value)}
                        onKeyDown={handleEnterSubmit}
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <div
                    className={`practice-feedback ${
                      status === "correct" || typingFeedback?.onOk ? "is-correct" : "is-wrong"
                    }`}
                  >
                    {status === "correct" || typingFeedback?.onOk ? (
                      <>
                        <strong>Correct!</strong> {onReadingLabel} is the correct romaji.
                      </>
                    ) : (
                      <>
                        <strong>Keep trying!</strong> The correct romaji is {onReadingLabel}.{" "}
                        <strong>You typed:</strong> {onInput || "-"}.
                      </>
                    )}
                  </div>
                  {!isKanaPractice ? (
                    <>
                      <h3 className="practice-question-title">Type the Kun Reading in romaji</h3>
                      <div
                        className={`practice-feedback ${
                          status === "correct" || typingFeedback?.kunOk ? "is-correct" : "is-wrong"
                        }`}
                      >
                        {status === "correct" || typingFeedback?.kunOk ? (
                          <>
                            <strong>Correct!</strong> {kunReadingLabel} is the correct romaji.
                          </>
                        ) : (
                          <>
                            <strong>Keep trying!</strong> The correct romaji is {kunReadingLabel}.{" "}
                            <strong>You typed:</strong> {kunInput || "-"}.
                          </>
                        )}
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              {status === "wrong" ? (
                <div className="practice-feedback is-wrong">
                  {exerciseType === "selection-kana" ? (
                    <>
                      <strong>Keep trying!</strong> The correct romaji reading is in option A.
                    </>
                  ) : (
                    <>
                      <strong>Keep trying!</strong> The correct kanji is in option A. <strong>Your selection:</strong>{" "}
                      {selectedOption != null ? kanjiOptions[selectedOption] : "None"}.
                    </>
                  )}
                </div>
              ) : null}
              {status === "correct" ? (
                <div className="practice-feedback is-correct">
                  <strong>Correct!</strong>{" "}
                  {exerciseType === "selection-kana"
                    ? "You selected the correct romaji reading."
                    : "This is the correct kanji."}
                </div>
              ) : null}

              {(exerciseType === "selection-kana" ? kanaOptions : kanjiOptions).map((option, idx) => (
                <SelectionOption key={idx} idx={idx} value={option} />
              ))}
            </>
          )}

          {status === "idle" ? (
            <button className="practice-submit-btn" onClick={submitAnswer}>
              Submit
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <div className="practice-post-cta-row">
              <button className="practice-half-btn" onClick={resetCurrentCard}>
                Practice Again
                <span aria-hidden="true">↻</span>
              </button>
              <button className="practice-half-btn" onClick={goNext}>
                {index >= sessionItems.length - 1 ? "Finish" : isKanaPractice ? "Next Kana" : "Next Kanji"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </article>
      </div>

      <div className="practice-instruction-box">
        <p>
          <span className="practice-instruction-title">Instructions:</span> Fill the input fields with the romaji
          writing for it. Some other exercises will include selection cards for you to practice kana and kanji too.{" "}
          <strong>Let&apos;s get started!</strong>
        </p>
      </div>
    </section>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [detail, setDetail] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedKanaLevel, setSelectedKanaLevel] = useState(null);
  const [kanaDetail, setKanaDetail] = useState(null);
  const [practiceItems, setPracticeItems] = useState(null);
  const [progressTrack, setProgressTrack] = useState("kanji");
  const [tick, setTick] = useState(0);
  const [levelFilter, setLevelFilter] = useState("all");
  const [jlptFilter, setJlptFilter] = useState("all");
  const [freqFilter, setFreqFilter] = useState("all");
  const [meaningFilter, setMeaningFilter] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [unlockSuccessOpen, setUnlockSuccessOpen] = useState(false);
  const [unlockSuccessCopy, setUnlockSuccessCopy] = useState({
    title: "Full access unlocked",
    message: "Your account now has access to the full Japanese Learning App.",
  });
  const [syncNotice, setSyncNotice] = useState(null);

  useEffect(() => {
    setLessons(lessonsToday());
    setReviews(reviewsDue());
    setStats(computeStats());
  }, [tick, view]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const session = await apiFetch("/api/auth/session");
        if (cancelled || !session?.user) return;
        setAuthUser(session.user);
      } catch {
        if (!cancelled) setAuthUser(null);
        return;
      }

      try {
        const snapshot = await apiFetch("/api/account/progress");
        if (cancelled) return;
        replaceLocalSnapshot(snapshot.progressMap || {}, snapshot.scheduleMap || {});
        setSyncNotice(null);
        setTick((t) => t + 1);
      } catch {
        if (!cancelled) {
          setSyncNotice({
            type: "warning",
            title: "Account sync needs attention",
            message: "We kept you signed in, but we could not refresh your saved progress from the server.",
          });
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function syncAccountProgress(snapshot = localSnapshot()) {
    if (!authUser) return;
    await apiFetch("/api/account/progress", {
      method: "PUT",
      body: JSON.stringify(snapshot),
    });
  }

  async function syncAccountProgressSafely(snapshot = localSnapshot(), context = "save your progress") {
    if (!authUser) return true;

    try {
      await syncAccountProgress(snapshot);
      setSyncNotice(null);
      return true;
    } catch {
      setSyncNotice({
        type: "warning",
        title: "Progress not synced yet",
        message: `We could not ${context} to your account just now. Your local progress is still on this device.`,
      });
      return false;
    }
  }

  async function handleAuthSubmit({ name, email, password }) {
    setAuthPending(true);
    setAuthError("");

    try {
      const guestSnapshot = localSnapshot();
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        authMode === "login"
          ? { email, password }
          : { name, email, password };
      const response = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuthUser(response.user);

      const remoteSnapshot = await apiFetch("/api/account/progress");
      if (snapshotHasData(remoteSnapshot)) {
        replaceLocalSnapshot(remoteSnapshot.progressMap || {}, remoteSnapshot.scheduleMap || {});
        setSyncNotice(null);
      } else if (snapshotHasData(guestSnapshot)) {
        replaceLocalSnapshot(guestSnapshot.progressMap || {}, guestSnapshot.scheduleMap || {});
        await apiFetch("/api/account/progress", {
          method: "PUT",
          body: JSON.stringify(guestSnapshot),
        });
        setSyncNotice(null);
      } else {
        replaceLocalSnapshot({}, {});
      }

      setAuthOpen(false);
      setTick((t) => t + 1);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleLogout() {
    setAuthPending(true);
    setAuthError("");

    try {
      if (authUser) {
        await syncAccountProgressSafely(localSnapshot(), "save your progress");
      }
      await apiFetch("/api/auth/logout", { method: "POST" });
      setAuthUser(null);
      setSyncNotice(null);
      replaceLocalSnapshot({}, {});
      setDetail(null);
      setKanaDetail(null);
      setSelectedLevel(null);
      setSelectedKanaLevel(null);
      setPracticeItems(null);
      setView("home");
      setAuthOpen(false);
      setTick((t) => t + 1);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleRedeemAccess(accessKey) {
    setAuthPending(true);
    setAuthError("");

    try {
      const response = await apiFetch("/api/account/redeem-access", {
        method: "POST",
        body: JSON.stringify({ accessKey }),
      });
      setAuthUser(response.user);
      setTick((t) => t + 1);
      setAuthOpen(false);
      setUnlockSuccessCopy({
        title: "Full access unlocked",
        message: "Success! Your account now has access to the full Japanese Learning App.",
      });
      setUnlockSuccessOpen(true);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthPending(false);
    }
  }

  function openAuthMode(nextMode) {
    setAuthError("");
    setAuthMode(nextMode);
    setAuthOpen(true);
  }

  function handleUserMenuAction(action) {
    if (action === "register") return openAuthMode("register");
    if (action === "pricing") return openAuthMode("pricing");
    return openAuthMode("login");
  }

  function loadDetail(id, context = null) {
    const fallbackLevel = findLevelForKanji(id);
    if (!hasFullAccess(authUser) && (context?.level?.level || fallbackLevel?.level || 1) > FREE_KANJI_LEVEL_LIMIT) {
      openAuthMode("pricing");
      return;
    }
    const kanji = KANJI.find((k) => k.id === id);
    const readings = READINGS.filter((r) => r.kanjiId === id);
    const radicals = KANJI_RADICALS.filter((kr) => kr.kanjiId === id)
      .map((kr) => RADICALS.find((r) => r.id === kr.radicalId));
    const vocab = VOCAB.filter((v) => v.kanjiId === id);
    const levelItems = context?.level?.items || fallbackLevel?.items || [];
    const levelNumber = context?.level?.level || fallbackLevel?.level || 1;
    const fallbackIndex = levelItems.findIndex((item) => item.id === id);
    const kanjiIndex = context?.index ?? Math.max(0, fallbackIndex);
    const progress = getProgress("kanji", id);
    setDetail({
      kanji,
      readings,
      radicals,
      vocab,
      levelNumber,
      levelKanjiIds: levelItems.map((item) => item.id),
      kanjiIndex,
      totalKanjiInLevel: levelItems.length || 1,
      isCompleted: progress ? isGuruOrAbove(progress.stage) : false,
    });
  }

  function loadKanaDetail(kind, item, level, index) {
    if (!hasFullAccess(authUser) && !isKanaLevelUnlocked(level?.level || 1, authUser)) {
      openAuthMode("pricing");
      return;
    }
    const progress = getProgress(kind, item.id);
    setKanaDetail({
      kind,
      item,
      level,
      index,
      isCompleted: progress ? isGuruOrAbove(progress.stage) : false,
    });
  }

  function completeLesson(item) {
    const stage = "apprentice-1";
    setProgress(item.type, item.item.id, stage, 0, 0);
    setSchedule(item.type, item.item.id, getNextReviewAt(stage));
    void syncAccountProgressSafely(localSnapshot(), "save your lesson progress");
    setTick((t) => t + 1);
  }

  function submitReview(item, result) {
    const reviewType = item.kind || item.type;
    const existing = getProgress(reviewType, item.id);
    const currentStage = existing ? existing.stage : "apprentice-1";
    const nextStage = result === "correct" ? advanceStage(currentStage) : resetStage();
    setProgress(reviewType, item.id, nextStage, result === "correct" ? 1 : 0, result === "correct" ? 0 : 1);
    setSchedule(reviewType, item.id, getNextReviewAt(nextStage));
    void syncAccountProgressSafely(localSnapshot(), "save your review progress");
    setTick((t) => t + 1);
  }

  function startPracticeSession(items) {
    const nextItems = items || [];
    const firstItem = nextItems[0];

    if (firstItem?.type === "kana") {
      setView(firstItem.kind === "katakana" ? "practice-katakana" : "practice-hiragana");
    } else if (firstItem) {
      setView("practice-kanji");
    }

    setPracticeItems(nextItems);
  }

  function setKanjiCompleted(completed) {
    if (!detail?.kanji?.id) return;
    const stage = completed ? "guru-1" : "apprentice-1";
    setProgress("kanji", detail.kanji.id, stage, 0, 0);
    setSchedule("kanji", detail.kanji.id, getNextReviewAt(stage));
    void syncAccountProgressSafely(localSnapshot(), "save your kanji progress");
    setDetail((prev) => (prev ? { ...prev, isCompleted: completed } : prev));
    setTick((t) => t + 1);
  }

  function setKanaCompleted(completed) {
    if (!kanaDetail?.item?.id || !kanaDetail?.kind) return;
    const stage = completed ? "guru-1" : "apprentice-1";
    setProgress(kanaDetail.kind, kanaDetail.item.id, stage, 0, 0);
    setSchedule(kanaDetail.kind, kanaDetail.item.id, getNextReviewAt(stage));
    void syncAccountProgressSafely(localSnapshot(), "save your kana progress");
    setKanaDetail((prev) => (prev ? { ...prev, isCompleted: completed } : prev));
    setTick((t) => t + 1);
  }

  function setKanjiLevelCompleted(level, completed) {
    if (!level?.items?.length) return;
    const stage = completed ? "guru-1" : "apprentice-1";
    level.items.forEach((item) => {
      setProgress("kanji", item.id, stage, 0, 0);
      setSchedule("kanji", item.id, getNextReviewAt(stage));
    });
    void syncAccountProgressSafely(localSnapshot(), "save your level progress");
    setTick((t) => t + 1);
  }

  function setKanaLevelCompleted(level, completed) {
    if (!level?.items?.length || !level.kind) return;
    const stage = completed ? "guru-1" : "apprentice-1";
    level.items.forEach((item) => {
      setProgress(level.kind, item.id, stage, 0, 0);
      setSchedule(level.kind, item.id, getNextReviewAt(stage));
    });
    void syncAccountProgressSafely(localSnapshot(), "save your level progress");
    setTick((t) => t + 1);
  }

  function navigateLevelKana(direction) {
    if (!kanaDetail?.level?.items?.length) return;
    const nextIndex = kanaDetail.index + direction;
    if (nextIndex < 0 || nextIndex >= kanaDetail.level.items.length) return;
    const nextItem = kanaDetail.level.items[nextIndex];
    loadKanaDetail(kanaDetail.kind, nextItem, kanaDetail.level, nextIndex);
  }

  function navigateLevelKanji(direction) {
    if (!detail?.levelKanjiIds?.length) return;
    const nextIndex = detail.kanjiIndex + direction;
    if (nextIndex < 0 || nextIndex >= detail.levelKanjiIds.length) return;
    const nextKanjiId = detail.levelKanjiIds[nextIndex];
    loadDetail(nextKanjiId, { level: selectedLevel || findLevelForKanji(nextKanjiId), index: nextIndex });
  }

  const content = useMemo(() => {
    if (view === "levels") {
      return (
        <AllContentLevelsView
          onOpenTrack={(track) => {
            if (track === "kanji") {
              setSelectedLevel(null);
              setView("levels-kanji");
            } else {
              setSelectedKanaLevel(null);
              setView(track === "hiragana" ? "levels-hiragana" : "levels-katakana");
            }
          }}
        />
      );
    }

    if (view === "levels-kanji" && selectedLevel) {
      return (
        <LevelDetailView
          level={selectedLevel}
          onBack={() => setSelectedLevel(null)}
          onSelectKanji={(id, index) => {
            setDetail(null);
            setView("kanji");
            loadDetail(id, { level: selectedLevel, index });
          }}
        />
      );
    }

    if (view === "levels-kanji") {
      return (
        <LevelsView
          levels={LEVELS}
          user={authUser}
          onUnlock={() => openAuthMode("pricing")}
          onToggleLevelCompleted={setKanjiLevelCompleted}
          onSelectLevel={(levelNum) => {
            const level = LEVELS.find((l) => l.level === levelNum);
            setSelectedLevel(level);
          }}
        />
      );
    }

    if ((view === "levels-hiragana" || view === "levels-katakana") && kanaDetail) {
      return (
        <KanaStudyView
          detail={kanaDetail}
          onBack={() => setKanaDetail(null)}
          onPrev={kanaDetail.index > 0 ? () => navigateLevelKana(-1) : null}
          onNext={kanaDetail.index < kanaDetail.level.items.length - 1 ? () => navigateLevelKana(1) : null}
          onPractice={() =>
            startPracticeSession([
              {
                type: "kana",
                kind: kanaDetail.kind,
                id: kanaDetail.item.id,
                prompt: kanaDetail.item.char,
                readings: [kanaDetail.item.romaji],
                meanings: [kanaDetail.item.meaning],
              },
            ])
          }
          onToggleCompleted={setKanaCompleted}
        />
      );
    }

    if ((view === "levels-hiragana" || view === "levels-katakana") && selectedKanaLevel) {
      return (
        <KanaLevelDetailView
          level={selectedKanaLevel}
          onBack={() => setSelectedKanaLevel(null)}
          onSelectKana={(item, index) =>
            loadKanaDetail(selectedKanaLevel.kind, item, selectedKanaLevel, index)
          }
        />
      );
    }

    if (view === "levels-hiragana" || view === "levels-katakana") {
      const kind = view === "levels-hiragana" ? "hiragana" : "katakana";
      return (
        <KanaLevelsView
          kind={kind}
          user={authUser}
          onUnlock={() => openAuthMode("pricing")}
          onToggleLevelCompleted={setKanaLevelCompleted}
          onOpenLevel={(levelNum) => {
            const src = kind === "hiragana" ? HIRAGANA_LEVELS : KATAKANA_LEVELS;
            setSelectedKanaLevel(src.find((l) => l.level === levelNum) || null);
          }}
        />
      );
    }

    if ((view === "kanji" || view === "kanji-list") && detail) {
      return (
        <KanjiDetailView
          detail={detail}
          onBack={() => {
            setDetail(null);
            if (selectedLevel) setView("levels-kanji");
          }}
          onPrev={detail.kanjiIndex > 0 ? () => navigateLevelKanji(-1) : null}
          onNext={
            detail.kanjiIndex < detail.totalKanjiInLevel - 1 ? () => navigateLevelKanji(1) : null
          }
          onPractice={() => setView("practice")}
          onToggleCompleted={setKanjiCompleted}
        />
      );
    }

    if (view === "kanji") {
      return (
        <DirectoryView
          onOpenTrack={(track) => {
            if (track === "kanji") {
              setView("kanji-list");
            } else {
              setSelectedKanaLevel(null);
              setKanaDetail(null);
              setView(track === "hiragana" ? "levels-hiragana" : "levels-katakana");
            }
          }}
        />
      );
    }

    if (view === "kanji-list") {
      const filtered = KANJI.filter((k) => {
        const levelOk = levelFilter === "all" ? true : difficultyByLevel(k.id) === levelFilter;
        const jlptOk =
          jlptFilter === "all" ? true : k.jlpt != null && String(k.jlpt) === jlptFilter;
        const meaningOk =
          !meaningFilter.trim() || String(k.meaning || "").toLowerCase().includes(meaningFilter.trim().toLowerCase());
        let freqOk = true;
        if (freqFilter === "high") freqOk = k.frequency != null && k.frequency <= 1000;
        if (freqFilter === "medium") freqOk = k.frequency != null && k.frequency > 1000 && k.frequency <= 3000;
        if (freqFilter === "low") freqOk = k.frequency != null && k.frequency > 3000;
        if (freqFilter === "unknown") freqOk = k.frequency == null;
        return levelOk && jlptOk && freqOk && meaningOk;
      });

      return (
        <KanjiListView
          items={filtered}
          onSelect={loadDetail}
          levelFilter={levelFilter}
          jlptFilter={jlptFilter}
          freqFilter={freqFilter}
          meaningFilter={meaningFilter}
          onFilterChange={({ level, jlpt, freq, query }) => {
            if (level != null) setLevelFilter(level);
            if (jlpt != null) setJlptFilter(jlpt);
            if (freq != null) setFreqFilter(freq);
            if (query != null) setMeaningFilter(query);
          }}
        />
      );
    }

    if (view === "practice" || view === "practice-kanji" || view === "practice-hiragana" || view === "practice-katakana") {
      if (practiceItems) {
        return (
          <PracticeSessionView
            items={practiceItems}
            onSubmit={submitReview}
            onExit={() => setPracticeItems(null)}
          />
        );
      }
      if (view === "practice") {
        return (
          <PracticeAllContentView
            user={authUser}
            onUnlock={() => openAuthMode("pricing")}
            onOpenTrack={(track) => {
              if (track === "kanji") setView("practice-kanji");
              if (track === "hiragana") setView("practice-hiragana");
              if (track === "katakana") setView("practice-katakana");
            }}
          />
        );
      }
      if (view === "practice-kanji") {
        return <PracticeMainView user={authUser} onUnlock={() => openAuthMode("pricing")} onStartPractice={startPracticeSession} />;
      }
      if (view === "practice-hiragana" || view === "practice-katakana") {
        return (
          <PracticeKanaLevelsView
            kind={view === "practice-hiragana" ? "hiragana" : "katakana"}
            user={authUser}
            onUnlock={() => openAuthMode("pricing")}
            onStartPractice={startPracticeSession}
          />
        );
      }
    }

    if (view === "progress") {
      return (
        <ProgressHubView
          track={progressTrack}
          onTrackChange={setProgressTrack}
          stats={stats}
          onSelectKanji={(id) => {
            const level = findLevelForKanji(id);
            setSelectedLevel(level);
            setView("kanji");
            loadDetail(id, { level, index: level ? level.items.findIndex((item) => item.id === id) : 0 });
          }}
          onStartKanjiPractice={(id) => {
            const items = buildPracticeItemsForKanjiIds([id]);
            setView("practice-kanji");
            setPracticeItems(items);
          }}
          onStartKanaPractice={(item) => {
            setView(item && /[\u30a0-\u30ff]/.test(item.char) ? "practice-katakana" : "practice-hiragana");
            setPracticeItems([
              {
                type: "kana",
                kind: /[\u30a0-\u30ff]/.test(item.char) ? "katakana" : "hiragana",
                id: item.id,
                prompt: item.char,
                readings: [item.romaji],
                meanings: [item.meaning],
              },
            ]);
          }}
        />
      );
    }

    if (view === "attribution") {
      return <AttributionView />;
    }

    return <HomeView stats={stats} onNavigate={setView} />;
  }, [
    view,
    detail,
    kanaDetail,
    lessons,
    reviews,
    stats,
    selectedLevel,
    selectedKanaLevel,
    progressTrack,
    levelFilter,
    jlptFilter,
    freqFilter,
    meaningFilter,
    practiceItems,
    authUser,
  ]);

  return (
    <main className="app-shell">
      <Nav
        current={
          view.startsWith("levels")
            ? "levels"
            : view.startsWith("practice")
            ? "practice"
            : view === "progress"
            ? "progress"
            : view === "kanji-list"
            ? "kanji"
            : view
        }
        user={authUser}
        onUserAction={handleUserMenuAction}
        onChange={(next) => {
          setDetail(null);
          setKanaDetail(null);
          setSelectedLevel(null);
          setSelectedKanaLevel(null);
          setPracticeItems(null);
          setView(next);
        }}
      />
      <MobileBrandHeader
        onClick={() => setView("home")}
        user={authUser}
        onUserAction={handleUserMenuAction}
      />
      <SyncStatusBanner
        notice={syncNotice}
        onDismiss={() => setSyncNotice(null)}
        onRetry={authUser ? () => void syncAccountProgressSafely(localSnapshot(), "save your progress") : null}
      />
      <div className="app-content">{content}</div>
      <DesktopAttributionFooter onNavigate={setView} />
      <AuthModal
        open={authOpen}
        mode={authMode}
        user={authUser}
        pending={authPending}
        error={authError}
        onModeChange={(nextMode) => {
          setAuthError("");
          setAuthMode(nextMode);
        }}
        onClose={() => {
          setAuthError("");
          setAuthOpen(false);
        }}
        onSubmit={handleAuthSubmit}
        onRedeemAccess={handleRedeemAccess}
        onLogout={handleLogout}
      />
      <UnlockSuccessModal
        open={unlockSuccessOpen}
        title={unlockSuccessCopy.title}
        message={unlockSuccessCopy.message}
        onClose={() => setUnlockSuccessOpen(false)}
      />
    </main>
  );
}
