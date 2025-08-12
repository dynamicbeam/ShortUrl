import express from 'express';
import sqlite3Base from 'sqlite3';
import { nanoid } from 'nanoid';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize sqlite3 with verbose logging
const sqlite3 = sqlite3Base.verbose();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- Serve Static Files (Frontend) ---
// Serve files from the 'dist' directory, using an absolute path
app.use(express.static(path.join(__dirname, 'dist')));

// --- Database Setup ---
// Use an absolute path for the database to avoid issues with CWD
const dbPath = path.join(__dirname, 'shortlinks.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT UNIQUE NOT NULL,
      long_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// --- API Routes ---

// API to get all short links
app.get('/links', (req, res) => {
  const sql = 'SELECT short_code, long_url, created_at FROM urls ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch links' });
    }
    const links = rows.map(row => ({
      shortUrl: `${req.get('referer')}${row.short_code}`,
      longUrl: row.long_url,
      createdAt: row.created_at
    }));
    res.json(links);
  });
});

// API to shorten a URL
app.post('/shorten', (req, res) => {
  const { longUrl, customCode } = req.body;

  if (!longUrl) {
    return res.status(400).json({ error: 'longUrl is required' });
  }

  const shortCode = customCode || nanoid(7);

  const sqlCheck = 'SELECT long_url FROM urls WHERE short_code = ?';
  db.get(sqlCheck, [shortCode], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error during check' });
    }
    if (row) {
      return res.status(409).json({ error: 'Custom code already in use.' });
    }

    const sqlInsert = 'INSERT INTO urls (short_code, long_url, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)';
    db.run(sqlInsert, [shortCode, longUrl], function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to create short link.' });
      }
    const fullShortUrl = `${req.get('referer')}/${shortCode}`;
    res.status(201).json({ shortUrl: fullShortUrl, shortCode });
    });
  });
});

// --- Redirect and Fallback Logic ---

// This must be after the API routes and static file serving
app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;

  if (shortCode === 'favicon.ico') {
    return res.status(204).send();
  }

  const sql = 'SELECT long_url FROM urls WHERE short_code = ?';
  db.get(sql, [shortCode], (err, row) => {
    if (err) {
      res.status(500).send('Error retrieving URL');
    } else if (row) {
      res.redirect(302, row.long_url);
    } else {
      // For any other GET request that is not a short link,
      // send the main index.html file. This is crucial for SPAs.
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });
});

app.listen(port, () => {
  console.log(`Server running! Open your browser to http://localhost:${port}`);
});
