const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { loadEnv } = require("./loadEnv");
const { initDb } = require("./db/init");
const { seedDb } = require("./db/seed");

loadEnv();

const app = express();

app.use(cors());
app.use(express.json());

const db = initDb();
seedDb(db);

const SESSION_COOKIE_NAME = "kanji_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const FULL_APP_UNLOCK_KEY = String(process.env.FULL_APP_UNLOCK_KEY || "").trim();

if (!FULL_APP_UNLOCK_KEY) {
  console.warn("[auth] FULL_APP_UNLOCK_KEY is not configured. Access-key redemption will be disabled.");
}

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

function nowIso() {
  return new Date().toISOString();
}

function expiresIso(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

function parseCookies(header = "") {
  return String(header)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const index = entry.indexOf("=");
      if (index === -1) return acc;
      const key = decodeURIComponent(entry.slice(0, index).trim());
      const value = decodeURIComponent(entry.slice(index + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    planType: user.plan_type || "trial",
    paymentStatus: user.payment_status || "pending",
  };
}

function validateAuthPayload({ name, email, password }, requireName = false) {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || "");

  if (requireName && normalizedName.length < 2) return "Name must be at least 2 characters.";
  if (!normalizedEmail || !normalizedEmail.includes("@")) return "Enter a valid email address.";
  if (normalizedPassword.length < 8) return "Password must be at least 8 characters.";
  return null;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)")
    .run(userId, hashToken(token), expiresIso(SESSION_TTL_MS));
  return token;
}

function ensureUserAccess(userId) {
  db.prepare(
    `INSERT INTO user_access (user_id, plan_type, payment_status, updated_at)
     VALUES (?, 'trial', 'pending', ?)
     ON CONFLICT(user_id) DO NOTHING`
  ).run(userId, nowIso());
}

function grantFullAccess(userId) {
  db.prepare(
    `INSERT INTO user_access (user_id, plan_type, payment_status, updated_at)
     VALUES (?, 'full', 'paid', ?)
     ON CONFLICT(user_id) DO UPDATE SET
       plan_type = 'full',
       payment_status = 'paid',
       updated_at = excluded.updated_at`
  ).run(userId, nowIso());
}

function clearSession(token) {
  if (!token) return;
  db.prepare("DELETE FROM user_sessions WHERE token_hash = ?").run(hashToken(token));
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_MS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function authMiddleware(req, res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  const sessionToken = req.cookies[SESSION_COOKIE_NAME];
  if (!sessionToken) {
    req.user = null;
    next();
    return;
  }

  const session = db.prepare(
    `SELECT u.id, u.name, u.email, ua.plan_type, ua.payment_status
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN user_access ua ON ua.user_id = u.id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  ).get(hashToken(sessionToken), nowIso());

  req.user = sanitizeUser(session);
  next();
}

function requireUser(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}

function parseProgressKey(key) {
  const [itemType, rawId] = String(key || "").split(":");
  const itemId = Number(rawId);
  if (!itemType || !Number.isFinite(itemId)) return null;
  return { itemType, itemId };
}

function normalizeProgressMap(input) {
  const map = input && typeof input === "object" ? input : {};
  const entries = [];

  for (const [itemKey, value] of Object.entries(map)) {
    const parsed = parseProgressKey(itemKey);
    if (!parsed || !value || typeof value !== "object") continue;
    entries.push({
      itemKey,
      itemType: parsed.itemType,
      itemId: parsed.itemId,
      srsStage: String(value.stage || "apprentice-1"),
      correctCount: Number.isFinite(Number(value.correct)) ? Number(value.correct) : 0,
      incorrectCount: Number.isFinite(Number(value.incorrect)) ? Number(value.incorrect) : 0,
    });
  }

  return entries;
}

function normalizeScheduleMap(input) {
  const map = input && typeof input === "object" ? input : {};
  const entries = [];

  for (const [itemKey, value] of Object.entries(map)) {
    const nextReviewAt = Number(value);
    if (!Number.isFinite(nextReviewAt)) continue;
    entries.push({ itemKey, nextReviewAt: String(nextReviewAt) });
  }

  return entries;
}

function loadAccountSnapshot(userId) {
  const progressRows = db.prepare(
    `SELECT item_key, srs_stage, correct_count, incorrect_count
     FROM user_progress
     WHERE user_id = ?`
  ).all(userId);
  const scheduleRows = db.prepare(
    `SELECT item_key, next_review_at
     FROM user_review_schedule
     WHERE user_id = ?`
  ).all(userId);

  const progressMap = {};
  const scheduleMap = {};

  progressRows.forEach((row) => {
    progressMap[row.item_key] = {
      stage: row.srs_stage,
      correct: row.correct_count,
      incorrect: row.incorrect_count,
    };
  });

  scheduleRows.forEach((row) => {
    const value = Number(row.next_review_at);
    if (Number.isFinite(value)) {
      scheduleMap[row.item_key] = value;
    }
  });

  return { progressMap, scheduleMap };
}

const saveAccountSnapshot = db.transaction((userId, progressEntries, scheduleEntries) => {
  db.prepare("DELETE FROM user_progress WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM user_review_schedule WHERE user_id = ?").run(userId);

  const insertProgress = db.prepare(
    `INSERT INTO user_progress
       (user_id, item_key, item_type, item_id, srs_stage, correct_count, incorrect_count, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertSchedule = db.prepare(
    `INSERT INTO user_review_schedule
       (user_id, item_key, next_review_at, updated_at)
     VALUES (?, ?, ?, ?)`
  );
  const updatedAt = nowIso();

  progressEntries.forEach((entry) => {
    insertProgress.run(
      userId,
      entry.itemKey,
      entry.itemType,
      entry.itemId,
      entry.srsStage,
      entry.correctCount,
      entry.incorrectCount,
      updatedAt
    );
  });

  scheduleEntries.forEach((entry) => {
    insertSchedule.run(userId, entry.itemKey, entry.nextReviewAt, updatedAt);
  });
});

app.use(authMiddleware);

function addHours(iso, hours) {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function getProgress(itemType, itemId) {
  return db
    .prepare(
      "SELECT item_type, item_id, srs_stage, correct_count, incorrect_count FROM progress WHERE item_type = ? AND item_id = ?"
    )
    .get(itemType, itemId);
}

function setProgress(itemType, itemId, srsStage, correctDelta, incorrectDelta) {
  const existing = getProgress(itemType, itemId);
  const correct = (existing ? existing.correct_count : 0) + correctDelta;
  const incorrect = (existing ? existing.incorrect_count : 0) + incorrectDelta;

  db.prepare("DELETE FROM progress WHERE item_type = ? AND item_id = ?").run(itemType, itemId);
  db.prepare(
    "INSERT INTO progress (item_type, item_id, srs_stage, correct_count, incorrect_count) VALUES (?, ?, ?, ?, ?)"
  ).run(itemType, itemId, srsStage, correct, incorrect);
}

function setSchedule(itemType, itemId, nextReviewAt) {
  db.prepare("DELETE FROM review_schedule WHERE item_type = ? AND item_id = ?").run(itemType, itemId);
  db.prepare(
    "INSERT INTO review_schedule (item_type, item_id, next_review_at) VALUES (?, ?, ?)"
  ).run(itemType, itemId, nextReviewAt);
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

function isNew(itemType, itemId) {
  return !getProgress(itemType, itemId);
}

function getNextReviewAt(stage) {
  const hours = SRS_INTERVAL_HOURS[stage] || 24;
  return addHours(nowIso(), hours);
}

function fetchKanjiList() {
  return db
    .prepare("SELECT id, character, meaning, difficulty FROM kanji ORDER BY difficulty, id")
    .all();
}

function fetchKanjiDetail(id) {
  const kanji = db
    .prepare("SELECT id, character, meaning, difficulty, stroke_count FROM kanji WHERE id = ?")
    .get(id);
  if (!kanji) return null;

  const readings = db
    .prepare("SELECT type, reading FROM readings WHERE kanji_id = ? ORDER BY type")
    .all(id);
  const radicals = db
    .prepare(
      "SELECT r.id, r.symbol, r.meaning FROM radicals r JOIN kanji_radicals kr ON kr.radical_id = r.id WHERE kr.kanji_id = ? ORDER BY r.id"
    )
    .all(id);
  const vocab = db
    .prepare("SELECT id, word, reading, meaning FROM vocab WHERE kanji_id = ? ORDER BY id")
    .all(id);

  return { kanji, readings, radicals, vocab };
}

function fetchRadicals() {
  return db.prepare("SELECT id, symbol, meaning FROM radicals ORDER BY id").all();
}

function fetchVocab() {
  return db.prepare("SELECT id, kanji_id, word, reading, meaning FROM vocab ORDER BY id").all();
}

function lessonsToday() {
  const RADICAL_LIMIT = 5;
  const KANJI_LIMIT = 5;
  const VOCAB_LIMIT = 5;
  const BUFFER = 3;

  const radicals = fetchRadicals().filter((r) => isNew("radical", r.id)).slice(0, RADICAL_LIMIT);

  const kanji = fetchKanjiList().filter((k) => isNew("kanji", k.id));
  const kanjiUnlocked = [];
  const kanjiLocked = [];

  for (const k of kanji) {
    const detail = fetchKanjiDetail(k.id);
    const allGuru = detail.radicals.every((r) => {
      const p = getProgress("radical", r.id);
      return p && isGuruOrAbove(p.srs_stage);
    });
    if (allGuru) kanjiUnlocked.push(k);
    else kanjiLocked.push(k);
  }

  const selectedKanji = [
    ...kanjiUnlocked.slice(0, KANJI_LIMIT),
    ...kanjiLocked.slice(0, Math.max(0, BUFFER - kanjiUnlocked.length)),
  ].slice(0, KANJI_LIMIT);

  const vocab = fetchVocab().filter((v) => isNew("vocab", v.id));
  const vocabUnlocked = [];
  const vocabLocked = [];

  for (const v of vocab) {
    const p = getProgress("kanji", v.kanji_id);
    if (p && isGuruOrAbove(p.srs_stage)) vocabUnlocked.push(v);
    else vocabLocked.push(v);
  }

  const selectedVocab = [
    ...vocabUnlocked.slice(0, VOCAB_LIMIT),
    ...vocabLocked.slice(0, Math.max(0, BUFFER - vocabUnlocked.length)),
  ].slice(0, VOCAB_LIMIT);

  const items = [
    ...radicals.map((r) => ({ type: "radical", item: r })),
    ...selectedKanji.map((k) => ({ type: "kanji", item: k })),
    ...selectedVocab.map((v) => ({ type: "vocab", item: v })),
  ];

  return items;
}

function reviewsDue() {
  const due = db
    .prepare("SELECT item_type, item_id, next_review_at FROM review_schedule WHERE next_review_at <= ? ORDER BY next_review_at")
    .all(nowIso());

  return due.map((row) => {
    if (row.item_type === "radical") {
      const r = db.prepare("SELECT id, symbol, meaning FROM radicals WHERE id = ?").get(row.item_id);
      return {
        type: "radical",
        id: r.id,
        prompt: r.symbol,
        meanings: [r.meaning],
        readings: [],
      };
    }

    if (row.item_type === "kanji") {
      const k = db.prepare("SELECT id, character, meaning FROM kanji WHERE id = ?").get(row.item_id);
      const readings = db
        .prepare("SELECT reading FROM readings WHERE kanji_id = ? ORDER BY type")
        .all(row.item_id)
        .map((r) => r.reading);
      return {
        type: "kanji",
        id: k.id,
        prompt: k.character,
        meanings: [k.meaning],
        readings,
      };
    }

    const v = db.prepare("SELECT id, word, reading, meaning FROM vocab WHERE id = ?").get(row.item_id);
    return {
      type: "vocab",
      id: v.id,
      prompt: v.word,
      meanings: [v.meaning],
      readings: [v.reading],
    };
  });
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/auth/session", (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/register", (req, res) => {
  const error = validateAuthPayload(req.body || {}, true);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists." });
    return;
  }

  const result = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name, email, createPasswordHash(String(req.body.password || "")));
  ensureUserAccess(result.lastInsertRowid);
  const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(result.lastInsertRowid);
  const token = createSession(user.id);
  setSessionCookie(res, token);

  res.status(201).json({ user: sanitizeUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const error = validateAuthPayload(req.body || {}, false);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const email = normalizeEmail(req.body.email);
  const user = db.prepare(
    `SELECT u.id, u.name, u.email, u.password_hash, ua.plan_type, ua.payment_status
     FROM users u
     LEFT JOIN user_access ua ON ua.user_id = u.id
     WHERE u.email = ?`
  ).get(email);
  if (!user || !verifyPassword(String(req.body.password || ""), user.password_hash)) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }
  ensureUserAccess(user.id);

  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json({ user: sanitizeUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  clearSession(req.cookies?.[SESSION_COOKIE_NAME]);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post("/api/account/redeem-access", requireUser, (req, res) => {
  const submittedKey = String(req.body?.accessKey || "").trim();
  if (!FULL_APP_UNLOCK_KEY) {
    res.status(503).json({ error: "Unlock key is not configured on the server." });
    return;
  }
  if (!submittedKey) {
    res.status(400).json({ error: "Enter an access key." });
    return;
  }
  if (submittedKey !== FULL_APP_UNLOCK_KEY) {
    res.status(401).json({ error: "That access key is not valid." });
    return;
  }

  grantFullAccess(req.user.id);
  const updatedUser = db.prepare(
    `SELECT u.id, u.name, u.email, ua.plan_type, ua.payment_status
     FROM users u
     LEFT JOIN user_access ua ON ua.user_id = u.id
     WHERE u.id = ?`
  ).get(req.user.id);
  res.json({ user: sanitizeUser(updatedUser) });
});

app.get("/api/account/progress", requireUser, (req, res) => {
  res.json(loadAccountSnapshot(req.user.id));
});

app.put("/api/account/progress", requireUser, (req, res) => {
  const progressEntries = normalizeProgressMap(req.body?.progressMap);
  const scheduleEntries = normalizeScheduleMap(req.body?.scheduleMap);
  saveAccountSnapshot(req.user.id, progressEntries, scheduleEntries);
  res.json({ ok: true });
});

app.get("/api/kanji", (req, res) => {
  res.json({ items: fetchKanjiList() });
});

app.get("/api/kanji/:id", (req, res) => {
  const id = Number(req.params.id);
  const detail = fetchKanjiDetail(id);
  if (!detail) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(detail);
});

app.get("/api/lessons/today", (req, res) => {
  res.json({ items: lessonsToday() });
});

app.post("/api/lessons/complete", (req, res) => {
  const { itemType, itemId } = req.body || {};
  if (!itemType || !itemId) {
    res.status(400).json({ error: "Missing itemType or itemId" });
    return;
  }

  const stage = "apprentice-1";
  setProgress(itemType, itemId, stage, 0, 0);
  setSchedule(itemType, itemId, getNextReviewAt(stage));
  res.json({ ok: true });
});

app.get("/api/reviews/today", (req, res) => {
  res.json({ items: reviewsDue() });
});

app.post("/api/reviews", (req, res) => {
  const { itemType, itemId, result } = req.body || {};
  if (!itemType || !itemId || !result) {
    res.status(400).json({ error: "Missing itemType, itemId, or result" });
    return;
  }

  const existing = getProgress(itemType, itemId);
  const currentStage = existing ? existing.srs_stage : "apprentice-1";
  const nextStage = result === "correct" ? advanceStage(currentStage) : resetStage();

  setProgress(itemType, itemId, nextStage, result === "correct" ? 1 : 0, result === "correct" ? 0 : 1);
  setSchedule(itemType, itemId, getNextReviewAt(nextStage));

  res.json({ ok: true, stage: nextStage });
});

app.get("/api/progress", (req, res) => {
  const totalKanji = db.prepare("SELECT COUNT(*) as c FROM kanji").get().c;
  const totalRadicals = db.prepare("SELECT COUNT(*) as c FROM radicals").get().c;
  const totalVocab = db.prepare("SELECT COUNT(*) as c FROM vocab").get().c;
  const learned = db.prepare("SELECT COUNT(*) as c FROM progress").get().c;
  const due = db
    .prepare("SELECT COUNT(*) as c FROM review_schedule WHERE next_review_at <= ?")
    .get(nowIso()).c;

  res.json({ totalKanji, totalRadicals, totalVocab, learned, due });
});

module.exports = { app };
