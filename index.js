const express = require('express');
const { Pool } = require('pg');

const app = express();

const PORT = process.env.PORT || 3000;

// 🔌 DB connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'devops',
  port: 5432,
});

app.get('/', (req, res) => {
  res.send('Version 2 🚀');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Test route
app.get('/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// introduce an error
app.get('/broken', (req, res) => {
  throw new Error("fail");
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});