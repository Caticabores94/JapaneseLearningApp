const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "kanji.db");
const schemaPath = path.join(__dirname, "schema.sql");
const migrationsPath = path.join(__dirname, "migrations");

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function applyMigrations(db) {
  ensureMigrationTable(db);
  if (!fs.existsSync(migrationsPath)) return;

  const applied = new Set(
    db.prepare("SELECT name FROM schema_migrations ORDER BY name").all().map((row) => row.name)
  );

  const migrationFiles = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const insertMigration = db.prepare("INSERT INTO schema_migrations (name) VALUES (?)");

  migrationFiles.forEach((file) => {
    if (applied.has(file)) return;
    const sql = fs.readFileSync(path.join(migrationsPath, file), "utf-8");
    const runMigration = db.transaction(() => {
      db.exec(sql);
      insertMigration.run(file);
    });
    runMigration();
  });
}

function initDb() {
  if (process.env.NODE_ENV === "production") {
    console.warn("[db] SQLite is still configured for production. Use persistent storage or migrate to Postgres before launch.");
  }

  const db = new Database(dbPath);
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  applyMigrations(db);
  return db;
}

module.exports = { initDb };
