const fs = require("fs");
const path = require("path");

const seedPath = path.join(__dirname, "seed.sql");

function seedDb(db) {
  const count = db.prepare("SELECT COUNT(*) as c FROM kanji").get();
  if (count.c === 0) {
    const seed = fs.readFileSync(seedPath, "utf-8");
    db.exec(seed);
  }
}

module.exports = { seedDb };
