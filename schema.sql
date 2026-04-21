CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    id_parent TEXT,
    url TEXT,
    filename TEXT NOT NULL,
    content TEXT,
    processed_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    lab INTEGER
);