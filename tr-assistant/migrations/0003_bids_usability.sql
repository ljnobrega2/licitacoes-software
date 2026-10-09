CREATE TABLE bids (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(opportunity_id),
  member_id TEXT NOT NULL REFERENCES members(id),
  basis TEXT NOT NULL CHECK (basis IN ('total','unit')),
  item_index INTEGER,
  item_label TEXT NOT NULL,
  amount TEXT NOT NULL,
  minimum TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  portal_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','reported')),
  receipt TEXT NOT NULL DEFAULT '',
  reported_by TEXT REFERENCES members(id),
  created_at TEXT NOT NULL,
  reported_at TEXT
);
CREATE INDEX bids_opportunity ON bids(opportunity_id,created_at DESC);
ALTER TABLE tasks ADD COLUMN deleted_at TEXT;
