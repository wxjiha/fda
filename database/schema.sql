-- database/schema.sql

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  features TEXT NOT NULL,
  prediction INTEGER NOT NULL,
  confidence REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  prediction_index INTEGER,
  prediction INTEGER,
  user_feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

