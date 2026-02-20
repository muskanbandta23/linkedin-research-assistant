import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'db', 'research.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    industry TEXT,
    website TEXT,
    revenue TEXT,
    cloud_usage TEXT,
    cloud_maturity TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS decision_makers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    linkedin_url TEXT,
    city TEXT,
    country TEXT,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS icp_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    industry TEXT,
    closest_existing_icp TEXT,
    why_similar TEXT,
    cloud_maturity_level TEXT,
    cloud_usage_signals TEXT,
    category TEXT DEFAULT 'similar',
    cloud_spend_reason TEXT,
    cloud_complexity TEXT,
    icp_similarity TEXT,
    why_strong_fit TEXT,
    google_verified INTEGER DEFAULT 0,
    verification_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS research_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    session_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    results TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS existing_icps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL UNIQUE,
    industry TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const defaultICPs = [
  { name: 'TCPL (Tata Consumer Products Limited)', industry: 'FMCG / Consumer Products' },
  { name: 'Condé Nast', industry: 'Media / Publishing' },
  { name: 'Diageo', industry: 'Beverages / FMCG' },
  { name: 'Shaddu.com', industry: 'Digital Commerce' },
  { name: 'Coca-Cola', industry: 'Beverages / FMCG' }
];

const insertICP = db.prepare('INSERT OR IGNORE INTO existing_icps (company_name, industry) VALUES (?, ?)');
for (const icp of defaultICPs) {
  insertICP.run(icp.name, icp.industry);
}

export default db;
