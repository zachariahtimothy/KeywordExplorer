import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";

export const dbConnection: SQLiteConnection = new SQLiteConnection(
  CapacitorSQLite
);

const defaultDbName = "gpt_summary";

export async function getDb(dbName = defaultDbName) {
  const ret = await dbConnection.checkConnectionsConsistency();
  const isConn = (await dbConnection.isConnection(dbName, false)).result;
  return ret.result && isConn
    ? dbConnection.retrieveConnection(dbName, false)
    : await dbConnection.createConnection(
        dbName,
        false,
        "no-encryption",
        1,
        false
      );
}

const createTables = `
CREATE TABLE IF NOT EXISTS table_parsed_text (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source INTEGER,
  summary_id INTEGER DEFAULT -1,
  parsed_text TEXT,
  embedding BLOB,
  moderation TEXT,
  sql_deleted BOOLEAN DEFAULT 0 CHECK (sql_deleted IN (0, 1)),
  last_modified INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS table_source (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_name VARCHAR(255),
  group_name VARCHAR(255),
  sql_deleted BOOLEAN DEFAULT 0 CHECK (sql_deleted IN (0, 1)),
  last_modified INTEGER DEFAULT (strftime('%s', 'now'))
);


CREATE TABLE IF NOT EXISTS table_summary_text (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source INTEGER,
  level INTEGER,
  summary_id INTEGER DEFAULT -1,
  summary_text TEXT,
  embedding BLOB,
  origins TEXT,
  moderation TEXT,
sql_deleted BOOLEAN DEFAULT 0 CHECK (sql_deleted IN (0, 1)),
  last_modified INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE VIEW IF NOT EXISTS source_text_view AS
SELECT s.id AS source_id, s.text_name AS text_name, s.group_name AS group_name,
       p.id AS text_id, p.summary_id AS summary_id, p.parsed_text AS parsed_text,
       p.embedding AS embedding, p.moderation AS moderation
FROM table_source s JOIN table_parsed_text p ON p.source = s.id;

CREATE VIEW IF NOT EXISTS summary_text_view AS
SELECT ts.id AS proj_id, ts.text_name AS text_name, ts.group_name AS group_name,
       tst.id AS text_id, tst.summary_id AS summary_id, tst.level AS level,
       tst.summary_text AS parsed_text, tst.embedding AS embedding, tst.origins AS origins,
       tst.moderation AS moderation
FROM table_summary_text tst
JOIN table_source ts ON tst.source = ts.id;
`;

export async function initDb(destroyFirst = false) {
  const db = await getDb();
  await db.open();

  if (destroyFirst) {
    await db.delete();
    console.log("Deletes db");
    return;
  }

  const results = await db.execute(createTables.replaceAll("\n", " "));
  if ((results.changes?.changes || 0) < 0) {
    console.error("createTables failed", results);
  }

  const syncResults = await db.createSyncTable();
  if ((syncResults.changes?.changes || 0) < 0) {
    console.error("createSyncTable failed", syncResults);
  }
  // const syncDate: string = new Date(2023, 4, 5, 14, 40, 0, 0).toISOString();
  // await db.setSyncDate(syncDate);

  await db.close();
}
