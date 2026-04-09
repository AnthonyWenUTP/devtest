const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || 'v1';

// =========================
// Prometheus Metrics
// =========================
client.collectDefaultMetrics();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// =========================
// PostgreSQL
// =========================
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'devops',
  port: 5432,
});

// =========================
// Middleware (metrics + logging)
// =========================
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path || req.path, // safer
      status: res.statusCode,
    });

    // Structured logging
    console.log(JSON.stringify({
      level: "info",
      method: req.method,
      path: req.path,
      status: res.statusCode,
      timestamp: new Date().toISOString(),
    }));
  });

  next();
});

// =========================
// Routes
// =========================
app.get('/', (req, res) => {
  res.send(`Version ${VERSION} 🚀`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    res.json({ time: result.rows[0] });

  } catch (err) {
    console.error(JSON.stringify({
      level: "error",
      message: "Database connection failed",
      error: err.message,
      timestamp: new Date().toISOString(),
    }));

    res.status(500).json({
      error: "Database unavailable",
      details: err.message
    });
  }
});

// =========================
// Observability
// =========================
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// =========================
// Failure Simulation (VERY IMPORTANT)
// =========================

// Crash the app (test Kubernetes restart)
app.get('/crash', (req, res) => {
  console.log("Crashing app...");
  process.exit(1);
});

// Slow response (test latency + scaling)
app.get('/slow', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 5000));
  res.send('Slow response');
});

// Version endpoint (for rollout demo)
app.get('/version', (req, res) => {
  res.json({ version: VERSION });
});

// =========================
// Start Server
// =========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});