// =============================================================
// Admin panel for the student-support agent.
//
// Purpose: every question the bot can't answer is already saved
// in `ticket_requests` with status = 'escalated' (see the n8n
// "No KB Match" node). This service is the human side of that
// flow: log in, see the escalated list, type a real answer, and
// it (a) gets added to `knowledge_base` so the bot can answer it
//     itself next time, and
// (b) marks the original ticket as answered.
//
// Auth: a single admin account, credentials from .env — no UI
// signup, no user table. Good enough for one person or a small
// team's own use; not meant to scale past that, and not meant to
// be exposed to the public internet without a reverse proxy in
// front of it (see docker-compose.yml comments).
//
// Static files: everything in ./public is served at the URL
// prefix /admin, so:
//   public/index.html -> http://<host>:4000/admin/
//   public/style.css  -> http://<host>:4000/admin/style.css
//   public/script.js  -> http://<host>:4000/admin/script.js
// The API lives under /admin/api/*. If you ever see 404s on the
// CSS/JS, it means this file is not the one actually running —
// check `docker compose logs admin` for the startup line below,
// which prints the exact directory being served.
// =============================================================

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

let express, mysql, jwt;
try {
  express = require("express");
  mysql = require("mysql2/promise");
  jwt = require("jsonwebtoken");
} catch (err) {
  console.error("[admin] A required package is not installed:", err.message);
  console.error("[admin] If you're running this outside Docker, run `npm install` in the admin/ folder first.");
  console.error("[admin] If you're running it via docker-compose, check `docker compose logs admin` for an npm install failure.");
  process.exit(1);
}

const {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_SESSION_SECRET,
  ADMIN_PORT,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

function requireEnv(pairs) {
  const missing = pairs.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    console.error(`[admin] Missing required env var(s): ${missing.join(", ")}`);
    console.error("[admin] Set them in your .env file at the project root, then restart:");
    console.error("[admin]   docker compose up -d --force-recreate admin");
    process.exit(1);
  }
}

requireEnv([
  ["ADMIN_USERNAME", ADMIN_USERNAME],
  ["ADMIN_PASSWORD", ADMIN_PASSWORD],
  ["ADMIN_SESSION_SECRET", ADMIN_SESSION_SECRET],
  ["DB_HOST", DB_HOST],
  ["DB_USER", DB_USER],
  ["DB_PASSWORD", DB_PASSWORD],
  ["DB_NAME", DB_NAME],
]);

if (ADMIN_SESSION_SECRET.length < 32) {
  console.error("[admin] ADMIN_SESSION_SECRET is too short. Generate one with: openssl rand -hex 32");
  process.exit(1);
}

const PORT = Number(ADMIN_PORT || 4000);
const PUBLIC_DIR = path.join(__dirname, "public");

// Fail loudly and immediately if the static folder is missing or
// empty, instead of silently serving 404s for every asset.
const REQUIRED_STATIC_FILES = ["index.html", "style.css", "script.js"];
for (const file of REQUIRED_STATIC_FILES) {
  const p = path.join(PUBLIC_DIR, file);
  if (!fs.existsSync(p)) {
    console.error(`[admin] Expected static file missing: ${p}`);
    console.error("[admin] The admin/public folder must contain index.html, style.css, and script.js.");
    console.error("[admin] If you're using docker-compose, check the 'admin' service's volumes mapping.");
    process.exit(1);
  }
}

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

const app = express();
app.use(express.json());

// Constant-time string compare, so login doesn't leak timing info.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal length to avoid an early-return
    // timing signal based on length alone.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function signToken() {
  return jwt.sign({ sub: "admin" }, ADMIN_SESSION_SECRET, { expiresIn: "12h" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    jwt.verify(token, ADMIN_SESSION_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

// ---------- Static panel (served under /admin) ----------
app.use("/admin", express.static(PUBLIC_DIR));
// Convenience redirect so http://host:4000/ doesn't just 404.
app.get("/", (req, res) => res.redirect("/admin"));

// ---------- API ----------
const api = express.Router();

api.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !safeEqual(username, ADMIN_USERNAME) ||
    !safeEqual(password, ADMIN_PASSWORD)
  ) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  res.json({ token: signToken() });
});

api.get("/me", requireAuth, (req, res) => res.json({ ok: true }));

// Escalated = the bot found nothing relevant in the knowledge base
// and logged it for a human (see the "No KB Match" n8n node).
api.get("/tickets", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, student_name, student_email, question, category, priority,
              status, created_at
       FROM ticket_requests
       WHERE status = 'escalated'
       ORDER BY created_at ASC
       LIMIT 200`
    );
    res.json({ tickets: rows });
  } catch (err) {
    console.error("[admin] GET /tickets failed:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

const ALLOWED_CATEGORIES = [
  "registration", "billing", "exams", "library",
  "records", "it-support", "financial-aid", "general",
];

// Answer a ticket: write the answer into knowledge_base (so the
// bot can self-serve this next time) and close out the ticket.
api.post("/tickets/:id/answer", requireAuth, async (req, res) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }

  const { title, content, keywords, category } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: "title and content are required" });
  }
  const safeCategory = ALLOWED_CATEGORIES.includes(category) ? category : "general";
  const safeKeywords = typeof keywords === "string" ? keywords : "";

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ticketRows] = await conn.query(
      "SELECT id, status FROM ticket_requests WHERE id = ? FOR UPDATE",
      [ticketId]
    );
    if (ticketRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Ticket not found" });
    }

    const [kbResult] = await conn.query(
      `INSERT INTO knowledge_base (title, content, keywords, category, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [title, content, safeKeywords, safeCategory]
    );
    const newKbId = kbResult.insertId;

    await conn.query(
      `UPDATE ticket_requests
       SET status = 'answered',
           answer = ?,
           category = ?,
           matched_kb_ids = JSON_ARRAY(?),
           error_message = NULL
       WHERE id = ?`,
      [content, safeCategory, newKbId, ticketId]
    );

    await conn.commit();
    res.json({ ok: true, knowledge_base_id: newKbId });
  } catch (err) {
    await conn.rollback();
    console.error("[admin] POST /tickets/:id/answer failed:", err.message);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
});

app.use("/admin/api", api);

// Catch-all 404 with a clear message, instead of Express's default
// HTML error page, to make misconfigured paths obvious in the browser.
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Verify the DB is actually reachable before declaring success, so
// a bad DB_HOST/DB_PASSWORD shows up immediately in the logs instead
// of only failing on the first click in the browser.
async function start() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
  } catch (err) {
    console.error("[admin] Could not connect to the database:", err.message);
    console.error(`[admin] Tried ${DB_HOST}:${DB_PORT || 3306}, database "${DB_NAME}", user "${DB_USER}".`);
    console.error("[admin] Check MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE in .env match on both the mysql and admin services.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[admin] Serving static files from: ${PUBLIC_DIR}`);
    console.log(`[admin] Listening on port ${PORT} — panel at http://localhost:${PORT}/admin`);
  });
}

start();
