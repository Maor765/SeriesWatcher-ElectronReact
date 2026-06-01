-- Applied inline by dbService.initDb
CREATE TABLE IF NOT EXISTS series (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  date  TEXT NOT NULL DEFAULT '',
  list  TEXT NOT NULL
);
