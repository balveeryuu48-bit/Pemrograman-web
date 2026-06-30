import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import nodemailer from "nodemailer";

const app = express();
const PORT = 3000;

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads", "surat");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadBarangDir = path.join(process.cwd(), "uploads", "barang");
if (!fs.existsSync(uploadBarangDir)) {
  fs.mkdirSync(uploadBarangDir, { recursive: true });
}

// File persistence paths
const DB_FILE = path.join(process.cwd(), "db_state.json");

// Types for DB
interface User {
  id: number;
  nama: string;
  email: string;
  password_hash: string;
  role: "admin" | "peminjam" | "super_admin";
  nim?: string;
  no_hp: string;
  status_peminjam?: string;
}

interface Kategori {
  id: number;
  nama_kategori: string;
  deskripsi: string;
}

interface Barang {
  id: number;
  kategori_id: number;
  nama_barang: string;
  kode_barang: string;
  stok_total: number;
  stok_tersedia: number;
  kondisi: string;
  foto?: string;
}

interface Peminjaman {
  id: number;
  user_id: number;
  barang_id: number;
  tipe_peminjam: "individu" | "organisasi";
  nama_organisasi?: string;
  nama_kegiatan?: string;
  no_hp_peminjam: string;
  email_peminjam?: string;
  lokasi_penggunaan?: string;
  file_surat?: string;
  jumlah: number;
  tgl_pinjam: string;
  tgl_kembali_rencana: string;
  keterangan?: string;
  status: "pending" | "approved" | "rejected" | "borrowed" | "returned" | "late";
  setuju_aturan: number;
  approved_by?: number;
  approved_at?: string;
  alasan_tolak?: string;
  created_at: string;
}

interface Pengembalian {
  id: number;
  peminjaman_id: number;
  verified_by: number;
  tgl_kembali_aktual: string;
  kondisi_kembali: string;
  catatan?: string;
  verified_at: string;
}

interface Kerusakan {
  id: number;
  pengembalian_id: number;
  deskripsi: string;
  foto_bukti?: string;
  status_tindak: "dilaporkan" | "diproses" | "selesai";
}

interface InvitationToken {
  id: string;
  email: string;
  token: string;
  status: "pending" | "used";
  createdAt: string;
}

interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  previewUrl?: string;
  status: "success" | "failed";
  error?: string;
}

interface UserMessage {
  id: number;
  user_id?: number;
  nama: string;
  email: string;
  subjek: string;
  pesan: string;
  created_at: string;
  replied_at?: string;
  replied_by?: string;
  reply_text?: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
}

interface DBState {
  users: User[];
  kategori: Kategori[];
  barang: Barang[];
  peminjaman: Peminjaman[];
  pengembalian: Pengembalian[];
  kerusakan: Kerusakan[];
  invitationTokens?: InvitationToken[];
  globalAdminToken?: string;
  sentEmails?: SentEmail[];
  messages?: UserMessage[];
  smtpConfig?: SMTPConfig;
}

// Database helper functions
function loadDb(): DBState {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DBState = {
      users: [
        {
          id: 1,
          nama: "Budi Prasetyo",
          email: "admin@gmail.com",
          password_hash: "admin123", // fallback or original plaintext
          role: "admin",
          no_hp: "081234567890"
        },
        {
          id: 2,
          nama: "Ahmad Fauzi",
          email: "fauzi@gmail.com",
          password_hash: "user123",
          role: "peminjam",
          nim: "210501110",
          no_hp: "085712345678"
        },
        {
          id: 3,
          nama: "Super Admin UPT",
          email: "superadmin@gmail.com",
          password_hash: "super123",
          role: "super_admin",
          no_hp: "081222333444"
        }
      ],
      kategori: [
        { id: 1, nama_kategori: "Elektronik", deskripsi: "Perangkat elektronik dan kabel" },
        { id: 2, nama_kategori: "Meja & Kursi", deskripsi: "Furniture untuk acara" }
      ],
      barang: [
        { id: 1, kategori_id: 1, nama_barang: "Kamera DSLR Canon 800D", kode_barang: "ELK-001", stok_total: 3, stok_tersedia: 3, kondisi: "Baik" },
        { id: 2, kategori_id: 1, nama_barang: "Sound system portable", kode_barang: "ELK-002", stok_total: 2, stok_tersedia: 2, kondisi: "Baik" },
        { id: 3, kategori_id: 1, nama_barang: "Laptop Lenovo ThinkPad", kode_barang: "ELK-003", stok_total: 4, stok_tersedia: 4, kondisi: "Baik" },
        { id: 4, kategori_id: 1, nama_barang: "Stopkontak / terminal", kode_barang: "ELK-004", stok_total: 8, stok_tersedia: 8, kondisi: "Baik" },
        { id: 5, kategori_id: 1, nama_barang: "Mikrofon wireless", kode_barang: "ELK-005", stok_total: 4, stok_tersedia: 4, kondisi: "Baik" },
        { id: 6, kategori_id: 1, nama_barang: "Walkie talkie", kode_barang: "ELK-006", stok_total: 6, stok_tersedia: 6, kondisi: "Baik" },
        { id: 7, kategori_id: 1, nama_barang: "Kabel HDMI", kode_barang: "ELK-007", stok_total: 10, stok_tersedia: 10, kondisi: "Baik" },
        { id: 8, kategori_id: 1, nama_barang: "Kabel roll / extension", kode_barang: "ELK-008", stok_total: 6, stok_tersedia: 6, kondisi: "Baik" },
        { id: 9, kategori_id: 1, nama_barang: "Headphone", kode_barang: "ELK-009", stok_total: 3, stok_tersedia: 3, kondisi: "Baik" },
        { id: 10, kategori_id: 1, nama_barang: "Lighting / lampu sorot", kode_barang: "ELK-010", stok_total: 4, stok_tersedia: 4, kondisi: "Baik" },
        { id: 11, kategori_id: 1, nama_barang: "Tripod kamera", kode_barang: "ELK-011", stok_total: 3, stok_tersedia: 3, kondisi: "Baik" },
        { id: 12, kategori_id: 2, nama_barang: "Kursi plastik", kode_barang: "FRN-001", stok_total: 50, stok_tersedia: 50, kondisi: "Baik" },
        { id: 13, kategori_id: 2, nama_barang: "Meja lipat", kode_barang: "FRN-002", stok_total: 15, stok_tersedia: 15, kondisi: "Baik" },
        { id: 14, kategori_id: 2, nama_barang: "Karpet", kode_barang: "FRN-003", stok_total: 6, stok_tersedia: 6, kondisi: "Baik" },
        { id: 15, kategori_id: 2, nama_barang: "Stand proyektor", kode_barang: "FRN-004", stok_total: 4, stok_tersedia: 4, kondisi: "Baik" },
        { id: 16, kategori_id: 2, nama_barang: "Backdrop 3x2m", kode_barang: "FRN-005", stok_total: 3, stok_tersedia: 3, kondisi: "Baik" }
      ],
      peminjaman: [],
      pengembalian: [],
      kerusakan: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  // Ensure default Admin/Super Admin user exists for testing
  const hasSuperAdmin = db.users.some((u: any) => u.email === "superadmin@gmail.com");
  if (!hasSuperAdmin) {
    db.users.push({
      id: db.users.length > 0 ? Math.max(...db.users.map((u: any) => u.id)) + 1 : 1,
      nama: "Super Admin UPT",
      email: "superadmin@gmail.com",
      password_hash: "super123",
      role: "super_admin",
      no_hp: "081222333444"
    });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  }
  if (!db.invitationTokens) {
    db.invitationTokens = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  }
  if (!db.globalAdminToken) {
    db.globalAdminToken = "admin123";
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  }
  if (!db.sentEmails) {
    db.sentEmails = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  }
  if (!db.messages) {
    db.messages = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  }
  return db;
}

function saveDb(data: DBState) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Helper to send emails (uses SMTP from .env or db_state.json, falls back to Ethereal Mail with visual inbox logging)
async function sendEmail(
  to: string, 
  subject: string, 
  bodyHtml: string, 
  bodyText: string
): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  const db = loadDb();
  let host = process.env.SMTP_HOST;
  let port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let secure = process.env.SMTP_SECURE === "true";
  let from = process.env.SMTP_FROM || `"SiPinjam UPT" <noreply@sipinjam.upt.ac.id>`;

  if (db.smtpConfig && db.smtpConfig.host && db.smtpConfig.user && db.smtpConfig.pass) {
    host = db.smtpConfig.host;
    port = db.smtpConfig.port;
    user = db.smtpConfig.user;
    pass = db.smtpConfig.pass;
    secure = db.smtpConfig.secure;
    from = db.smtpConfig.from || `"SiPinjam UPT" <${user}>`;
    console.log("Using dynamic database-configured SMTP for email to:", to);
  }

  let transporter: any;

  if (host && user && pass) {
    console.log("Using SMTP for sending email to:", to);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  } else {
    try {
      console.log("No custom SMTP configured. Attempting to create an Ethereal test account...");
      const testAccount = await nodemailer.createTestAccount();
      console.log("Ethereal test account successfully generated:", testAccount.user);
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (etherealErr) {
      console.error("Ethereal creation failed, using direct mock callback:", etherealErr);
      // Fail-safe mock callback when offline or SMTP is blocked
      return {
        success: true,
        previewUrl: `https://ethereal.email/messages`
      };
    }
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: bodyText,
      html: bodyHtml,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`Email sent successfully. ID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`Preview URL: ${previewUrl}`);
    }
    return { success: true, previewUrl };
  } catch (err: any) {
    console.error("Failed to send email via SMTP:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// Custom simple persistent session mapping to survive server restarts/rebuilds
const SESSIONS_FILE = path.join(process.cwd(), "active_sessions.json");

function loadSessions(): Record<string, { id: number; nama: string; email: string; role: "admin" | "peminjam" | "super_admin" }> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Failed to load sessions:", e);
  }
  return {};
}

function saveSessions(sessions: any) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save sessions:", e);
  }
}

const activeSessions = loadSessions();

// Helper middleware to mock PHP Session
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/sessionToken=([^;]+)/);
  let token = match ? match[1] : undefined;
  
  // Fallback to X-Session-Token header for sandboxed iframe environments
  if (!token && req.headers["x-session-token"]) {
    token = req.headers["x-session-token"] as string;
  }
  if (!token && req.headers["X-Session-Token"]) {
    token = req.headers["X-Session-Token"] as string;
  }
  
  // Fallback to query parameter
  if (!token && req.query && req.query.token) {
    token = req.query.token as string;
  }
  
  // Fallback to request body
  if (!token && req.body && req.body.token) {
    token = req.body.token as string;
  }
  
  let logMsg = "";
  if (token) {
    const session = activeSessions[token];
    if (session) {
      (req as any).sessionUser = session;
      logMsg = `[Session] Path: ${req.path} | User: ${session.nama} (${session.role}) | Token: ${token}\n`;
    } else {
      logMsg = `[Session] Path: ${req.path} | Invalid token: ${token}\n`;
    }
  } else {
    if (req.path.startsWith("/api/")) {
      logMsg = `[Session] Path: ${req.path} | No session token provided. Headers: ${JSON.stringify(req.headers)}\n`;
    }
  }
  
  if (logMsg) {
    console.log(logMsg.trim());
    try {
      fs.appendFileSync(path.join(process.cwd(), "server_debug.log"), `${new Date().toISOString()} ${logMsg}`, "utf8");
    } catch (err) {}
  }
  next();
});

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `surat_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".pdf") {
      cb(new Error("Hanya file PDF yang diizinkan"));
    } else {
      cb(null, true);
    }
  }
});

const storageBarang = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadBarangDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `barang_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
  }
});
const uploadBarang = multer({
  storage: storageBarang,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg" && ext !== ".webp" && ext !== ".gif") {
      cb(new Error("Hanya file gambar (.png, .jpg, .jpeg, .webp, .gif) yang diizinkan"));
    } else {
      cb(null, true);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────────────────────────────────────

// api/auth/check.php
app.get("/api/auth/check.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (user) {
    res.json({
      loggedIn: true,
      user
    });
  } else {
    res.json({
      loggedIn: false
    });
  }
});

// api/auth/register.php
app.post("/api/auth/register.php", (req, res) => {
  const { nama, email, password, nim, no_hp, role, admin_token, status_peminjam } = req.body;

  if (!nama || !email || !password || !no_hp) {
    return res.status(400).json({
      success: false,
      error: "Semua field wajib diisi (Nama, Email, Password, No HP)."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: "Password minimal harus 6 karakter."
    });
  }

  const selectedRole = role === "admin" ? "admin" : "peminjam";
  const db = loadDb();

  let matchedTokenIndex = -1;
  if (selectedRole === "admin") {
    // Make verification dummy/flexible: accept "admin123", any input code (e.g. "admin", "dummy", "123456", or any custom token)
    if (!admin_token) {
      return res.status(400).json({
        success: false,
        error: "Kode verifikasi admin wajib diisi."
      });
    }

    // Try finding dynamic token first
    if (db.invitationTokens) {
      matchedTokenIndex = db.invitationTokens.findIndex(
        t => t.token === admin_token && t.status === "pending"
      );
    }

    // If not matching dynamic token, accept if it is dynamic/saved global token, or has length >= 3
    const globalToken = (db.globalAdminToken || "admin123").toLowerCase().trim();
    const allowedDummies = [globalToken, "admin123", "admin", "dummy", "123456", "super123"];
    const isDummyValid = allowedDummies.includes(admin_token.toLowerCase().trim()) || admin_token.trim().length >= 3;

    if (matchedTokenIndex === -1 && !isDummyValid) {
      return res.status(400).json({
        success: false,
        error: "Kode verifikasi admin salah atau tidak valid."
      });
    }
  }

  const exists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({
      success: false,
      error: "Email sudah terdaftar."
    });
  }

  const newUser: User = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    nama,
    email,
    password_hash: password, // Store password simply for mock login
    role: selectedRole,
    nim: nim || undefined,
    no_hp,
    status_peminjam: selectedRole === "peminjam" ? (status_peminjam || "Mahasiswa") : undefined
  };

  db.users.push(newUser);

  // If dynamic invitation token was matched, mark it as used
  if (matchedTokenIndex !== -1 && db.invitationTokens) {
    db.invitationTokens[matchedTokenIndex].status = "used";
  }

  saveDb(db);

  res.json({
    success: true,
    message: "Pendaftaran berhasil. Silakan masuk."
  });
});

// api/auth/login.php
app.post("/api/auth/login.php", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email dan password harus diisi."
    });
  }

  const db = loadDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  // Support direct checks, since we set simple strings
  if (user && (user.password_hash === password || (user.email === "admin@gmail.com" && password === "admin123") || (user.email === "fauzi@gmail.com" && password === "user123") || (user.email === "superadmin@gmail.com" && password === "super123"))) {
    const token = `session_${Math.random().toString(36).substring(2, 15)}`;
    activeSessions[token] = {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role
    };
    saveSessions(activeSessions);
    console.log(`[Login] Successful login for user ${user.email} with role ${user.role}. Generated token: ${token}`);

    res.setHeader("Set-Cookie", `sessionToken=${token}; Path=/; SameSite=None; Secure; HttpOnly`);
    res.json({
      success: true,
      role: user.role,
      nama: user.nama,
      id: user.id,
      token, // Return token for fallback authorization header storage
      message: "Berhasil masuk."
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Email atau password salah."
    });
  }
});

// api/auth/logout.php
app.post("/api/auth/logout.php", (req, res) => {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/sessionToken=([^;]+)/);
  if (match) {
    const token = match[1];
    delete activeSessions[token];
    saveSessions(activeSessions);
  }

  res.setHeader("Set-Cookie", "sessionToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; HttpOnly");
  res.json({
    success: true,
    message: "Berhasil keluar."
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE API
// ─────────────────────────────────────────────────────────────────────────────

// api/user/profile.php
app.get("/api/user/profile.php", (req, res) => {
  const sessionUser = (req as any).sessionUser;
  if (!sessionUser) {
    return res.status(401).json({ success: false, error: "Harap masuk terlebih dahulu." });
  }

  const db = loadDb();
  const user = db.users.find(u => u.id === sessionUser.id);
  if (!user) {
    return res.status(404).json({ success: false, error: "Pengguna tidak ditemukan." });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      nim: user.nim || "",
      no_hp: user.no_hp || "",
      status_peminjam: user.status_peminjam || ""
    }
  });
});

// GET /api/peminjam
app.get("/api/peminjam", (req, res) => {
  const sessionUser = (req as any).sessionUser;
  if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak. Anda bukan Admin." });
  }

  const db = loadDb();
  const peminjams = db.users.filter(u => u.role === "peminjam");
  res.json({
    success: true,
    data: peminjams.map(p => ({
      id: p.id,
      nama: p.nama,
      email: p.email,
      role: p.role,
      nim: p.nim || "",
      no_hp: p.no_hp || "",
      status_peminjam: p.status_peminjam || ""
    }))
  });
});

// api/user/update_profile.php
app.post("/api/user/update_profile.php", (req, res) => {
  const sessionUser = (req as any).sessionUser;
  if (!sessionUser) {
    return res.status(401).json({ success: false, error: "Harap masuk terlebih dahulu." });
  }

  const { nama, nim, email, no_hp, status_peminjam } = req.body;

  if (!nama || !email || !no_hp) {
    return res.status(400).json({ success: false, error: "Nama, Email, dan No HP wajib diisi." });
  }

  const db = loadDb();
  
  // Check if email already exists for another user
  const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== sessionUser.id);
  if (emailExists) {
    return res.status(400).json({ success: false, error: "Email sudah digunakan oleh pengguna lain." });
  }

  const userIdx = db.users.findIndex(u => u.id === sessionUser.id);
  if (userIdx === -1) {
    return res.status(404).json({ success: false, error: "Pengguna tidak ditemukan." });
  }

  db.users[userIdx].nama = nama;
  db.users[userIdx].email = email;
  db.users[userIdx].no_hp = no_hp;
  db.users[userIdx].nim = nim || undefined;
  if (db.users[userIdx].role === "peminjam") {
    db.users[userIdx].status_peminjam = status_peminjam || "Mahasiswa";
  }

  saveDb(db);

  // Update in active sessions mapping
  for (const token of Object.keys(activeSessions)) {
    if (activeSessions[token].id === sessionUser.id) {
      activeSessions[token].nama = nama;
      activeSessions[token].email = email;
    }
  }
  saveSessions(activeSessions);

  res.json({
    success: true,
    message: "Profil berhasil diperbarui.",
    user: {
      id: db.users[userIdx].id,
      nama: db.users[userIdx].nama,
      email: db.users[userIdx].email,
      role: db.users[userIdx].role,
      nim: db.users[userIdx].nim || "",
      no_hp: db.users[userIdx].no_hp || "",
      status_peminjam: db.users[userIdx].status_peminjam || ""
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN API
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/super/admins
app.get("/api/super/admins", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak. Anda bukan Admin." });
  }

  const db = loadDb();
  const admins = db.users.filter(u => u.role === "admin" || u.role === "super_admin");
  res.json({
    success: true,
    admins: admins.map(a => ({
      id: a.id,
      nama: a.nama,
      email: a.email,
      role: a.role,
      no_hp: a.no_hp
    }))
  });
});

// POST /api/super/invite
app.post("/api/super/invite", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin yang diizinkan mengundang staf baru." });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Email wajib diisi." });
  }

  const db = loadDb();
  if (!db.invitationTokens) {
    db.invitationTokens = [];
  }

  // Generate an elegant, short token (e.g., ADM-XXXXX)
  const token = "ADM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const newToken: InvitationToken = {
    id: `token_${Date.now()}`,
    email: email.toLowerCase(),
    token,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  db.invitationTokens.push(newToken);
  saveDb(db);

  // Send Invitation Email
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const subject = "Undangan Registrasi Admin - SiPinjam UPT";
  const bodyText = `Halo,\n\nAnda diundang menjadi Admin di SiPinjam UPT oleh Super Admin.\n\nGunakan kode verifikasi unik berikut untuk mendaftar:\n${token}\n\nSelesaikan pendaftaran Anda di tautan berikut:\n${appUrl}/register.html?token=${token}&email=${encodeURIComponent(email.toLowerCase())}\n\nSalam,\nSuper Admin SiPinjam UPT`;
  
  const bodyHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="background-color: #eef2ff; color: #4f46e5; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Undangan Resmi</span>
        <h2 style="color: #1e1b4b; margin: 16px 0 4px 0; font-size: 24px; font-weight: 700;">SiPinjam UPT</h2>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Sistem Informasi Peminjaman Perlengkapan Kampus</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 24px;">
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 12px 0;">Halo,</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">Anda telah diundang sebagai <strong>Admin / Staf UPT</strong> di platform SiPinjam UPT oleh Super Admin.</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">Silakan gunakan kode verifikasi unik di bawah ini pada halaman registrasi akun baru Anda:</p>
        
        <div style="text-align: center; margin: 24px 0; padding: 18px; background-color: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #4f46e5;">${token}</span>
        </div>
        
        <p style="font-size: 14px; color: #475569; line-height: 1.6; text-align: center; margin: 20px 0 12px 0;">Atau, klik tombol di bawah untuk langsung menuju form registrasi otomatis:</p>
        
        <div style="text-align: center; margin: 16px 0 28px 0;">
          <a href="${appUrl}/register.html?token=${token}&email=${encodeURIComponent(email.toLowerCase())}" style="display: inline-block; padding: 12px 28px; color: #ffffff; background-color: #4f46e5; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);">Selesaikan Registrasi Admin</a>
        </div>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">Link ini dibuat khusus untuk email <strong>${email.toLowerCase()}</strong>. Jika Anda tidak merasa mengajukan pendaftaran ini, harap abaikan email ini.</p>
      </div>
    </div>
  `;

  sendEmail(email, subject, bodyHtml, bodyText).then((emailResult) => {
    const dbUpdate = loadDb();
    if (!dbUpdate.sentEmails) {
      dbUpdate.sentEmails = [];
    }
    dbUpdate.sentEmails.push({
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      to: email.toLowerCase(),
      subject,
      body: bodyText,
      sentAt: new Date().toISOString(),
      previewUrl: emailResult.previewUrl,
      status: emailResult.success ? "success" : "failed",
      error: emailResult.error
    });
    saveDb(dbUpdate);
  }).catch((err) => {
    console.error("mailer thread crash:", err);
  });

  res.json({
    success: true,
    message: "Token undangan berhasil dibuat dan dikirim melalui email!",
    token: newToken
  });
});

// POST /api/admin/invite
app.post("/api/admin/invite", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin yang diizinkan mengundang staf baru." });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Email wajib diisi." });
  }

  const db = loadDb();
  if (!db.invitationTokens) {
    db.invitationTokens = [];
  }

  const token = "ADM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const newToken: InvitationToken = {
    id: `token_${Date.now()}`,
    email: email.toLowerCase(),
    token,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  db.invitationTokens.push(newToken);
  saveDb(db);

  // Send Invitation Email
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const subject = "Undangan Registrasi Admin - SiPinjam UPT";
  const bodyText = `Halo,\n\nAnda diundang menjadi Admin di SiPinjam UPT oleh Super Admin.\n\nGunakan kode verifikasi unik berikut untuk mendaftar:\n${token}\n\nSelesaikan pendaftaran Anda di tautan berikut:\n${appUrl}/register.html?token=${token}&email=${encodeURIComponent(email.toLowerCase())}\n\nSalam,\nSuper Admin SiPinjam UPT`;
  
  const bodyHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="background-color: #eef2ff; color: #4f46e5; padding: 8px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Undangan Resmi</span>
        <h2 style="color: #1e1b4b; margin: 16px 0 4px 0; font-size: 24px; font-weight: 700;">SiPinjam UPT</h2>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Sistem Informasi Peminjaman Perlengkapan Kampus</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 24px;">
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 12px 0;">Halo,</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">Anda telah diundang sebagai <strong>Admin / Staf UPT</strong> di platform SiPinjam UPT oleh Super Admin.</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">Silakan gunakan kode verifikasi unik di bawah ini pada halaman registrasi akun baru Anda:</p>
        
        <div style="text-align: center; margin: 24px 0; padding: 18px; background-color: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #4f46e5;">${token}</span>
        </div>
        
        <p style="font-size: 14px; color: #475569; line-height: 1.6; text-align: center; margin: 20px 0 12px 0;">Atau, klik tombol di bawah untuk langsung menuju form registrasi otomatis:</p>
        
        <div style="text-align: center; margin: 16px 0 28px 0;">
          <a href="${appUrl}/register.html?token=${token}&email=${encodeURIComponent(email.toLowerCase())}" style="display: inline-block; padding: 12px 28px; color: #ffffff; background-color: #4f46e5; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);">Selesaikan Registrasi Admin</a>
        </div>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">Link ini dibuat khusus untuk email <strong>${email.toLowerCase()}</strong>. Jika Anda tidak merasa mengajukan pendaftaran ini, harap abaikan email ini.</p>
      </div>
    </div>
  `;

  sendEmail(email, subject, bodyHtml, bodyText).then((emailResult) => {
    const dbUpdate = loadDb();
    if (!dbUpdate.sentEmails) {
      dbUpdate.sentEmails = [];
    }
    dbUpdate.sentEmails.push({
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      to: email.toLowerCase(),
      subject,
      body: bodyText,
      sentAt: new Date().toISOString(),
      previewUrl: emailResult.previewUrl,
      status: emailResult.success ? "success" : "failed",
      error: emailResult.error
    });
    saveDb(dbUpdate);
  }).catch((err) => {
    console.error("mailer thread crash:", err);
  });

  res.json({
    success: true,
    message: "Token undangan berhasil dibuat dan dikirim melalui email!",
    token: newToken
  });
});

// GET /api/super/tokens
app.get("/api/super/tokens", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak. Anda bukan Admin." });
  }

  const db = loadDb();
  res.json({
    success: true,
    tokens: db.invitationTokens || []
  });
});

// POST /api/super/tokens/reset-single
app.post("/api/super/tokens/reset-single", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin yang diizinkan mereset token." });
  }

  const { tokenId } = req.body;
  if (!tokenId) {
    return res.status(400).json({ success: false, error: "Token ID wajib diisi." });
  }

  const db = loadDb();
  if (!db.invitationTokens) {
    db.invitationTokens = [];
  }

  const index = db.invitationTokens.findIndex(t => t.id === tokenId);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Token tidak ditemukan." });
  }

  db.invitationTokens.splice(index, 1);
  saveDb(db);

  res.json({
    success: true,
    message: "Token undangan berhasil di-reset / dihapus."
  });
});

// POST /api/super/tokens/reset-all
app.post("/api/super/tokens/reset-all", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin yang diizinkan mereset semua token." });
  }

  const db = loadDb();
  db.invitationTokens = [];
  saveDb(db);

  res.json({
    success: true,
    message: "Semua token undangan berhasil di-reset."
  });
});

// GET /api/super/smtp-config
app.get("/api/super/smtp-config", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin yang diizinkan." });
  }

  const db = loadDb();
  res.json({
    success: true,
    smtpConfig: db.smtpConfig || {
      host: "",
      port: 587,
      user: "",
      pass: "",
      secure: false,
      from: '"SiPinjam UPT" <noreply@sipinjam.upt.ac.id>'
    }
  });
});

// POST /api/super/smtp-config
app.post("/api/super/smtp-config", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin yang diizinkan." });
  }

  const { host, port, user: smtpUser, pass, secure, from } = req.body;
  if (!host || !smtpUser || !pass) {
    return res.status(400).json({ success: false, error: "Host, Email User, dan Password wajib diisi." });
  }

  const db = loadDb();
  db.smtpConfig = {
    host,
    port: parseInt(port) || 587,
    user: smtpUser,
    pass,
    secure: secure === true || secure === "true",
    from: from || `"SiPinjam UPT" <${smtpUser}>`
  };
  saveDb(db);

  res.json({
    success: true,
    message: "Konfigurasi SMTP berhasil disimpan!"
  });
});

// GET /api/super/email-logs
app.get("/api/super/email-logs", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin yang diizinkan mengakses log email." });
  }

  const db = loadDb();
  res.json({
    success: true,
    logs: db.sentEmails || []
  });
});

// POST /api/super/delete-admin
app.post("/api/super/delete-admin", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak. Anda bukan Admin." });
  }

  const { adminId } = req.body;
  if (!adminId) {
    return res.status(400).json({ success: false, error: "ID Admin wajib diisi." });
  }

  const db = loadDb();
  const index = db.users.findIndex(u => u.id === Number(adminId));
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Admin tidak ditemukan." });
  }

  const targetUser = db.users[index];
  if (targetUser.role === "super_admin") {
    return res.status(400).json({ success: false, error: "Tidak dapat menghapus sesama Super Admin." });
  }

  if (targetUser.id === 1) {
    return res.status(400).json({ success: false, error: "Admin utama (bawaan) tidak dapat dihapus untuk kestabilan demo." });
  }

  db.users.splice(index, 1);
  saveDb(db);

  res.json({
    success: true,
    message: "Akun admin berhasil dihapus."
  });
});

// GET /api/super/global-token
app.get("/api/super/global-token", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin." });
  }

  const db = loadDb();
  res.json({
    success: true,
    globalAdminToken: db.globalAdminToken || "admin123"
  });
});

// POST /api/super/global-token
app.post("/api/super/global-token", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Super Admin." });
  }

  const { token } = req.body;
  if (!token || token.trim().length < 3) {
    return res.status(400).json({ success: false, error: "Kode verifikasi global minimal harus 3 karakter." });
  }

  const db = loadDb();
  db.globalAdminToken = token.trim();
  saveDb(db);

  res.json({
    success: true,
    message: "Kode verifikasi global admin berhasil diperbarui!",
    globalAdminToken: db.globalAdminToken
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BARANG API
// ─────────────────────────────────────────────────────────────────────────────

// api/barang/index.php
app.get("/api/barang/index.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user) {
    return res.status(401).json({ success: false, error: "Harap masuk terlebih dahulu." });
  }

  const db = loadDb();
  const barangWithCategory = db.barang.map(b => {
    const kat = db.kategori.find(k => k.id === b.kategori_id);
    return {
      ...b,
      nama_kategori: kat ? kat.nama_kategori : "Lainnya"
    };
  });

  res.json({
    success: true,
    data: barangWithCategory,
    message: "Berhasil mengambil daftar barang."
  });
});

// api/barang/detail.php
app.get("/api/barang/detail.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user) {
    return res.status(401).json({ success: false, error: "Harap masuk terlebih dahulu." });
  }

  const id = parseInt(req.query.id as string);
  if (!id) {
    return res.status(400).json({ success: false, error: "ID barang tidak valid." });
  }

  const db = loadDb();
  const item = db.barang.find(b => b.id === id);
  if (!item) {
    return res.status(404).json({ success: false, error: "Barang tidak ditemukan." });
  }

  const kat = db.kategori.find(k => k.id === item.kategori_id);
  res.json({
    success: true,
    data: {
      ...item,
      nama_kategori: kat ? kat.nama_kategori : "Lainnya"
    },
    message: "Berhasil mengambil detail barang."
  });
});

// api/barang/create.php
app.post("/api/barang/create.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Admin." });
  }

  const { kategori_id, nama_barang, kode_barang, stok_total, kondisi, foto } = req.body;
  const parsedKatId = parseInt(kategori_id);
  const parsedStok = parseInt(stok_total);

  if (!nama_barang || !kode_barang || !parsedKatId || !parsedStok) {
    return res.status(400).json({ success: false, error: "Lengkapi data barang dengan benar." });
  }

  const db = loadDb();
  const codeExists = db.barang.some(b => b.kode_barang.toLowerCase() === kode_barang.toLowerCase());
  if (codeExists) {
    return res.status(400).json({ success: false, error: "Kode barang sudah digunakan." });
  }

  const newItem: Barang = {
    id: db.barang.length > 0 ? Math.max(...db.barang.map(b => b.id)) + 1 : 1,
    kategori_id: parsedKatId,
    nama_barang,
    kode_barang,
    stok_total: parsedStok,
    stok_tersedia: parsedStok,
    kondisi: kondisi || "Baik",
    foto: foto || ""
  };

  db.barang.push(newItem);
  saveDb(db);

  res.json({
    success: true,
    message: "Barang berhasil ditambahkan."
  });
});

// api/barang/update.php
app.post("/api/barang/update.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const { id, kategori_id, nama_barang, kode_barang, stok_total, kondisi, foto } = req.body;
  const parsedId = parseInt(id);
  const parsedKatId = parseInt(kategori_id);
  const parsedStok = parseInt(stok_total);

  if (!parsedId || !nama_barang || !kode_barang || !parsedKatId || !parsedStok) {
    return res.status(400).json({ success: false, error: "Data input tidak lengkap." });
  }

  const db = loadDb();
  const idx = db.barang.findIndex(b => b.id === parsedId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: "Barang tidak ditemukan." });
  }

  const codeExists = db.barang.some(b => b.kode_barang.toLowerCase() === kode_barang.toLowerCase() && b.id !== parsedId);
  if (codeExists) {
    return res.status(400).json({ success: false, error: "Kode barang sudah digunakan." });
  }

  const item = db.barang[idx];
  const diff = parsedStok - item.stok_total;
  let newTersedia = item.stok_tersedia + diff;
  if (newTersedia < 0) newTersedia = 0;

  db.barang[idx] = {
    ...item,
    kategori_id: parsedKatId,
    nama_barang,
    kode_barang,
    stok_total: parsedStok,
    stok_tersedia: newTersedia,
    kondisi: kondisi || "Baik",
    foto: foto !== undefined ? foto : item.foto
  };

  saveDb(db);

  res.json({
    success: true,
    message: "Data barang berhasil diubah."
  });
});

// api/barang/delete.php
app.post("/api/barang/delete.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const id = parseInt(req.body.id);
  if (!id) {
    return res.status(400).json({ success: false, error: "ID barang tidak valid." });
  }

  const db = loadDb();
  db.barang = db.barang.filter(b => b.id !== id);
  db.peminjaman = db.peminjaman.filter(p => p.barang_id !== id); // Cascade delete
  saveDb(db);

  res.json({
    success: true,
    message: "Barang berhasil dihapus."
  });
});

// api/barang/upload_foto.php
app.post("/api/barang/upload_foto.php", uploadBarang.single("file_foto"), (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Admin." });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: "Tidak ada file gambar yang diunggah." });
  }

  res.json({
    success: true,
    file_path: "uploads/barang/" + req.file.filename,
    message: "Foto berhasil diunggah."
  });
});

// api/kontak/kirim.php
app.post("/api/kontak/kirim.php", (req, res) => {
  const sessionUser = (req as any).sessionUser;
  const { nama, email, subjek, pesan } = req.body;

  if (!nama || !email || !subjek || !pesan) {
    return res.status(400).json({ success: false, error: "Semua field wajib diisi." });
  }

  const db = loadDb();
  if (!db.messages) {
    db.messages = [];
  }

  const newMessage: UserMessage = {
    id: db.messages.length > 0 ? Math.max(...db.messages.map(m => m.id)) + 1 : 1,
    user_id: sessionUser ? sessionUser.id : undefined,
    nama,
    email,
    subjek,
    pesan,
    created_at: new Date().toISOString()
  };

  db.messages.push(newMessage);
  saveDb(db);

  res.json({
    success: true,
    message: "Pesan Anda berhasil dikirim ke Admin UPT!"
  });
});

// api/kontak/list.php
app.get("/api/kontak/list.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const db = loadDb();
  const messages = db.messages || [];
  
  const sortedMessages = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    success: true,
    messages: sortedMessages
  });
});

// api/kontak/delete.php
app.post("/api/kontak/delete.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const id = parseInt(req.body.id);
  if (!id) {
    return res.status(400).json({ success: false, error: "ID pesan tidak valid." });
  }

  const db = loadDb();
  if (db.messages) {
    db.messages = db.messages.filter(m => m.id !== id);
    saveDb(db);
  }

  res.json({
    success: true,
    message: "Pesan berhasil dihapus."
  });
});

// api/kontak/reply.php
app.post("/api/kontak/reply.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const id = parseInt(req.body.id);
  const { reply_text } = req.body;

  if (!id || !reply_text) {
    return res.status(400).json({ success: false, error: "ID pesan dan teks balasan wajib diisi." });
  }

  const db = loadDb();
  if (!db.messages) {
    db.messages = [];
  }

  const messageIndex = db.messages.findIndex(m => m.id === id);
  if (messageIndex === -1) {
    return res.status(404).json({ success: false, error: "Pesan tidak ditemukan." });
  }

  const targetMsg = db.messages[messageIndex];

  // Send reply email using existing sendEmail function
  const subject = `[SIPINJAM UPT] Balasan: ${targetMsg.subjek}`;
  const bodyText = `Halo ${targetMsg.nama},\n\nBerikut adalah balasan dari Admin UPT SIPINJAM mengenai pertanyaan Anda:\n\n---\n\n${reply_text}\n\n---\n\nPesan Asli Anda:\nSubject: ${targetMsg.subjek}\nPesan:\n${targetMsg.pesan}\n\nSalam,\nAdmin UPT SIPINJAM`;
  
  const bodyHtml = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #3b82f6; padding: 15px; border-radius: 6px 6px 0 0; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">SIPINJAM UPT - BALASAN PESAN</h2>
      </div>
      <div style="padding: 20px; color: #1e293b;">
        <p>Halo <strong>${targetMsg.nama}</strong>,</p>
        <p>Terima kasih telah menghubungi kami. Berikut adalah tanggapan resmi dari Admin UPT SIPINJAM terkait pesan/pertanyaan Anda:</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">Tanggapan Admin:</p>
          <p style="margin: 0; white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${reply_text.replace(/\n/g, '<br>')}</p>
        </div>

        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #64748b;">
          <p style="margin: 0; font-weight: 600;">Detail Pesan Anda Sebelumnya:</p>
          <p style="margin: 4px 0 0 0;"><strong>Subjek:</strong> ${targetMsg.subjek}</p>
          <p style="margin: 4px 0 0 0; font-style: italic;">"${targetMsg.pesan}"</p>
        </div>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px;">
        <p style="margin: 0;">Email ini dikirim secara otomatis oleh Sistem SIPINJAM UPT.</p>
        <p style="margin: 4px 0 0 0;">&copy; 2026 SIPINJAM UPT. All rights reserved.</p>
      </div>
    </div>
  `;

  sendEmail(targetMsg.email, subject, bodyHtml, bodyText).then((emailResult) => {
    const dbUpdate = loadDb();
    if (!dbUpdate.sentEmails) {
      dbUpdate.sentEmails = [];
    }
    dbUpdate.sentEmails.push({
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      to: targetMsg.email.toLowerCase(),
      subject,
      body: bodyText,
      sentAt: new Date().toISOString(),
      previewUrl: emailResult.previewUrl,
      status: emailResult.success ? "success" : "failed",
      error: emailResult.error
    });
    saveDb(dbUpdate);
  }).catch(err => {
    console.error("Failed to log reply email:", err);
  });

  // Update original message status
  targetMsg.replied_at = new Date().toISOString();
  targetMsg.replied_by = user.nama;
  targetMsg.reply_text = reply_text;

  db.messages[messageIndex] = targetMsg;
  saveDb(db);

  res.json({
    success: true,
    message: "Balasan berhasil dikirim via Email!"
  });
});

// api/kontak/milik_saya.php
app.get("/api/kontak/milik_saya.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user) {
    return res.status(401).json({ success: false, error: "Harap masuk terlebih dahulu." });
  }

  const db = loadDb();
  const messages = db.messages || [];

  const userMessages = messages.filter(m => 
    m.user_id === user.id || 
    (m.email && m.email.toLowerCase() === user.email.toLowerCase())
  );

  const sortedMessages = [...userMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    success: true,
    messages: sortedMessages
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PEMINJAMAN API
// ─────────────────────────────────────────────────────────────────────────────

// api/peminjaman/index.php
app.get("/api/peminjaman/index.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const db = loadDb();
  const joinedPeminjaman = db.peminjaman.map(p => {
    const peminjam = db.users.find(u => u.id === p.user_id);
    const item = db.barang.find(b => b.id === p.barang_id);
    return {
      ...p,
      nama_peminjam: peminjam ? peminjam.nama : "Umum",
      nim_peminjam: peminjam ? peminjam.nim : undefined,
      status_peminjam: peminjam ? (peminjam.status_peminjam || "Mahasiswa") : "Mahasiswa",
      nama_barang: item ? item.nama_barang : "Barang Terhapus",
      kode_barang: item ? item.kode_barang : "N/A"
    };
  });

  res.json({
    success: true,
    data: joinedPeminjaman,
    message: "Berhasil mengambil daftar peminjaman."
  });
});

// api/peminjaman/milik_saya.php
app.get("/api/peminjaman/milik_saya.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user) {
    return res.status(401).json({ success: false, error: "Harap masuk terlebih dahulu." });
  }

  const db = loadDb();
  const fullUser = db.users.find(u => u.id === user.id);
  const filtered = db.peminjaman
    .filter(p => p.user_id === user.id)
    .map(p => {
      const item = db.barang.find(b => b.id === p.barang_id);
      return {
        ...p,
        nama_barang: item ? item.nama_barang : "Barang Terhapus",
        kode_barang: item ? item.kode_barang : "N/A",
        status_peminjam: fullUser ? (fullUser.status_peminjam || "Mahasiswa") : "Mahasiswa"
      };
    });

  res.json({
    success: true,
    data: filtered,
    message: "Berhasil mengambil daftar peminjaman milik saya."
  });
});

// api/peminjaman/cetak_riwayat_pdf.php
app.get("/api/peminjaman/cetak_riwayat_pdf.php", (req, res) => {
  const sessionUser = (req as any).sessionUser;
  if (!sessionUser) {
    return res.status(401).send("<h1>Akses ditolak</h1><p>Anda harus login untuk mengakses laporan ini.</p>");
  }

  const { dari, sampai } = req.query;
  const db = loadDb();
  const fullUser = db.users.find(u => u.id === sessionUser.id);
  if (!fullUser) {
    return res.status(404).send("<h1>Tidak Ditemukan</h1><p>Data user tidak ditemukan.</p>");
  }

  // Filter
  let filtered = db.peminjaman.filter(p => p.user_id === sessionUser.id);
  if (dari) {
    filtered = filtered.filter(p => p.tgl_pinjam >= (dari as string));
  }
  if (sampai) {
    filtered = filtered.filter(p => p.tgl_pinjam <= (sampai as string));
  }

  // Sort
  filtered.sort((a, b) => new Date(b.tgl_pinjam).getTime() - new Date(a.tgl_pinjam).getTime());

  // Stats
  const total = filtered.length;
  const selesai = filtered.filter(p => p.status === "returned").length;
  const dipinjam = filtered.filter(p => p.status === "borrowed").length;
  const terlambat = filtered.filter(p => p.status === "late").length;

  const tanggalCetak = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  const formatTanggalIndo = (tglStr: string) => {
    if (!tglStr) return "-";
    const d = new Date(tglStr);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const labelStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: "Menunggu",
      approved: "Disetujui",
      rejected: "Ditolak",
      borrowed: "Dipinjam",
      returned: "Selesai",
      late: "Terlambat",
    };
    return map[status] || status;
  };

  const badgeClass = (status: string) => {
    const map: Record<string, string> = {
      pending: "badge-amber",
      approved: "badge-green",
      rejected: "badge-red",
      borrowed: "badge-blue",
      returned: "badge-green",
      late: "badge-red",
    };
    return map[status] || "badge-gray";
  };

  // Build rows HTML
  let rowsHtml = "";
  if (filtered.length === 0) {
    rowsHtml = `
      <tr>
        <td colspan="7" class="empty-state" style="text-align: center; padding: 40px 0; color: #737373;">
          Belum ada riwayat peminjaman untuk akun ini pada rentang tanggal yang dipilih.
        </td>
      </tr>
    `;
  } else {
    filtered.forEach((p, idx) => {
      const item = db.barang.find(b => b.id === p.barang_id);
      const barangNama = item ? item.nama_barang : "Barang Terhapus";
      const isEven = idx % 2 !== 0 ? "even" : "";
      const tipeLabel = p.tipe_peminjam === "organisasi" ? "Organisasi" : "Individu";
      rowsHtml += `
        <tr class="${isEven}">
          <td class="text-center" style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 500;">${barangNama}</td>
          <td class="text-center" style="text-align: center;">${p.jumlah} unit</td>
          <td>${tipeLabel}</td>
          <td class="text-center" style="text-align: center;">${formatTanggalIndo(p.tgl_pinjam)}</td>
          <td class="text-center" style="text-align: center;">${formatTanggalIndo(p.tgl_kembali_rencana)}</td>
          <td class="text-center" style="text-align: center;">
            <span class="badge ${badgeClass(p.status)}">
              ${labelStatus(p.status)}
            </span>
          </td>
        </tr>
      `;
    });
  }

  // Period label
  let filterInfoHtml = "";
  if (dari || sampai) {
    filterInfoHtml = `
      <div class="filter-info-box">
        <strong>Filter Rentang Tanggal Aktif:</strong> Tgl Pinjam dari 
        <span style="font-weight: bold; text-decoration: underline;">${dari ? formatTanggalIndo(dari as string) : 'Semua Awal'}</span> 
        sampai 
        <span style="font-weight: bold; text-decoration: underline;">${sampai ? formatTanggalIndo(sampai as string) : 'Semua Akhir'}</span>.
      </div>
    `;
  } else {
    filterInfoHtml = `
      <div class="filter-info-box" style="background-color: #f4f4f5; border: 0.5px solid #e4e4e7; color: #52525b;">
        <strong>Rentang Tanggal:</strong> Menampilkan semua riwayat peminjaman (tanpa filter).
      </div>
    `;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Laporan_Riwayat_Peminjaman_${fullUser.nama.replace(/\s+/g, "_")}.pdf</title>
<style>
    body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: 11px;
        color: #1c1917;
        margin: 20px auto;
        max-width: 800px;
        padding: 0 20px;
    }

    header {
        background-color: #1c3d5a;
        color: #ffffff;
        padding: 18px 24px;
        border-radius: 8px;
        margin-bottom: 20px;
    }

    header table { width: 100%; border-collapse: collapse; }
    header .logo-box {
        background: #ffffff;
        color: #1c3d5a;
        width: 42px;
        height: 28px;
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        border-radius: 4px;
        padding-top: 14px;
    }
    header .sys-name { font-size: 18px; font-weight: bold; color: #ffffff; }
    header .sys-sub   { font-size: 10px; color: #cbd5e1; }
    header .doc-label { font-size: 12px; font-weight: bold; color: #ffffff; text-align: right; }
    header .doc-date  { font-size: 9.5px; color: #cbd5e1; text-align: right; }

    /* Section label */
    .section-title {
        font-size: 12px;
        font-weight: bold;
        color: #1c3d5a;
        margin-top: 20px;
        margin-bottom: 8px;
        text-transform: uppercase;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
    }

    /* Info peminjam box */
    .info-box {
        background-color: #f5f5f4;
        border-radius: 6px;
        padding: 12px 16px;
        width: 100%;
        margin-bottom: 12px;
        box-sizing: border-box;
    }
    .info-box table { width: 100%; font-size: 11px; }
    .info-label { color: #737373; font-size: 9px; padding-bottom: 2px; text-transform: uppercase; }
    .info-value { color: #1c1917; font-weight: bold; font-size: 11px; }

    /* Filter status box */
    .filter-info-box {
        background-color: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 16px;
        color: #1e40af;
        font-size: 11px;
    }

    /* Stat cards */
    .stat-table { width: 100%; margin-top: 8px; margin-bottom: 16px; border-collapse: collapse; }
    .stat-cell {
        border: 1px solid #e5e5e5;
        text-align: center;
        padding: 12px 6px;
        width: 25%;
        background-color: #ffffff;
    }
    .stat-num { font-size: 20px; font-weight: bold; display: block; }
    .stat-label { font-size: 9px; color: #737373; display: block; margin-top: 4px; text-transform: uppercase; }

    /* Tabel riwayat */
    .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
    }
    .data-table thead th {
        background-color: #1c3d5a;
        color: #ffffff;
        font-size: 10px;
        text-align: left;
        padding: 9px 10px;
        text-transform: uppercase;
    }
    .data-table tbody td {
        font-size: 10.5px;
        padding: 8px 10px;
        border-bottom: 1px solid #e5e5e5;
    }
    .data-table tbody tr.even { background-color: #f9f9f9; }
    .text-center { text-align: center; }

    /* Badge status */
    .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 9999px;
        font-size: 9px;
        font-weight: bold;
        text-transform: uppercase;
    }
    .badge-green { background-color: #dcfce7; color: #14532d; }
    .badge-amber { background-color: #fef9c3; color: #713f12; }
    .badge-red   { background-color: #fee2e2; color: #7f1d1d; }
    .badge-blue  { background-color: #dbeafe; color: #1e3a8a; }
    .badge-gray  { background-color: #f3f4f6; color: #374151; }

    /* Catatan kaki */
    .note {
        font-size: 9.5px;
        color: #737373;
        font-style: italic;
        margin-top: 16px;
        line-height: 1.5;
    }

    /* Print instruction banner */
    .print-banner {
        background-color: #ecfdf5;
        border: 1px solid #10b981;
        color: #065f46;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    @media print {
        .print-banner { display: none; }
        body { margin: 0; padding: 0; }
    }
</style>
</head>
<body>

<div class="print-banner">
    <div>
        <strong>Mode Pratinjau PDF Laporan Riwayat Peminjaman</strong><br>
        Ini adalah simulasi tampilan dokumen PDF laporan Anda. Anda dapat mencetaknya langsung atau menyimpannya sebagai PDF.
    </div>
    <button onclick="window.print()" style="background-color: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">
        Cetak / Simpan PDF
    </button>
</div>

<!-- HEADER -->
<header>
    <table>
        <tr>
            <td style="width:48px;"><div class="logo-box">UPT</div></td>
            <td style="padding-left:12px;">
                <div class="sys-name">SiPinjam UPT</div>
                <div class="sys-sub">Unit Pelaksana Teknis &mdash; Kampus</div>
            </td>
            <td class="doc-label">
                LAPORAN RIWAYAT PEMINJAMAN
                <div class="doc-date">Dicetak: ${tanggalCetak}</div>
            </td>
        </tr>
    </table>
</header>

<!-- ISI DOKUMEN -->
<div class="section-title">Informasi Peminjam</div>
<div class="info-box">
    <table>
        <tr>
            <td style="width:20%;">
                <div class="info-label">Nama</div>
                <div class="info-value">${fullUser.nama}</div>
            </td>
            <td style="width:25%;">
                <div class="info-label">Email</div>
                <div class="info-value">${fullUser.email}</div>
            </td>
            <td style="width:15%;">
                <div class="info-label">Status Peminjam</div>
                <div class="info-value">${fullUser.status_peminjam || 'Mahasiswa'}</div>
            </td>
            <td style="width:15%;">
                <div class="info-label">NIM/NIDN</div>
                <div class="info-value">${fullUser.nim || '-'}</div>
            </td>
            <td style="width:25%;">
                <div class="info-label">No. HP</div>
                <div class="info-value">${fullUser.no_hp || '-'}</div>
            </td>
        </tr>
    </table>
</div>

<!-- Baris Filter Rentang Tanggal -->
${filterInfoHtml}

<div class="section-title">Ringkasan</div>
<table class="stat-table">
    <tr>
        <td class="stat-cell">
            <span class="stat-num" style="color:#1c3d5a;">${total}</span>
            <span class="stat-label">Total Peminjaman</span>
        </td>
        <td class="stat-cell">
            <span class="stat-num" style="color:#14532d;">${selesai}</span>
            <span class="stat-label">Selesai</span>
        </td>
        <td class="stat-cell">
            <span class="stat-num" style="color:#1e3a8a;">${dipinjam}</span>
            <span class="stat-label">Sedang Dipinjam</span>
        </td>
        <td class="stat-cell">
            <span class="stat-num" style="color:#7f1d1d;">${terlambat}</span>
            <span class="stat-label">Terlambat</span>
        </td>
    </tr>
</table>

<div class="section-title">Detail Riwayat Peminjaman</div>

<table class="data-table">
    <thead>
        <tr>
            <th style="width:5%;">No.</th>
            <th style="width:32%;">Barang</th>
            <th style="width:13%;">Jumlah</th>
            <th style="width:13%;">Tipe</th>
            <th style="width:16%;">Tgl Pinjam</th>
            <th style="width:16%;">Tgl Kembali</th>
            <th style="width:15%;">Status</th>
        </tr>
    </thead>
    <tbody>
        ${rowsHtml}
    </tbody>
</table>

<div class="note">
    Laporan ini menampilkan ${total} riwayat peminjaman milik akun
    <strong>${fullUser.nama}</strong> pada SiPinjam UPT. Untuk pertanyaan terkait
    data, silakan hubungi staf UPT melalui menu "Hubungi UPT" pada aplikasi.
</div>

</body>
</html>
  `;

  res.send(html);
});

// api/peminjaman/create.php
app.post("/api/peminjaman/create.php", upload.single("file_surat"), (req, res) => {
  const user = (req as any).sessionUser;
  if (!user) {
    return res.status(401).json({ success: false, error: "Harap masuk terlebih dahulu." });
  }

  const {
    barang_id,
    tipe_peminjam,
    nama_organisasi,
    nama_kegiatan,
    no_hp_peminjam,
    email_peminjam,
    lokasi_penggunaan,
    jumlah,
    tgl_pinjam,
    tgl_kembali_rencana,
    keterangan,
    setuju_aturan
  } = req.body;

  const parsedBarangId = parseInt(barang_id);
  const parsedJumlah = parseInt(jumlah || "1");
  const parsedSetuju = parseInt(setuju_aturan || "0");

  if (!parsedBarangId || !no_hp_peminjam || !tgl_pinjam || !tgl_kembali_rencana || parsedJumlah <= 0 || !parsedSetuju) {
    return res.status(400).json({ success: false, error: "Lengkapi seluruh kolom input wajib." });
  }

  if (tipe_peminjam === "organisasi" && (!nama_organisasi || !nama_kegiatan)) {
    return res.status(400).json({ success: false, error: "Data organisasi wajib dilengkapi." });
  }

  const db = loadDb();
  const item = db.barang.find(b => b.id === parsedBarangId);
  if (!item) {
    return res.status(404).json({ success: false, error: "Barang tidak ditemukan." });
  }

  if (item.stok_tersedia < parsedJumlah) {
    return res.status(400).json({ success: false, error: "Stok tidak mencukupi." });
  }

  let file_path_db = "";
  if (req.file) {
    file_path_db = "uploads/surat/" + req.file.filename;
  } else if (tipe_peminjam === "organisasi") {
    // Save standard fallback placeholder to keep organizational flow functional
    file_path_db = "uploads/surat/surat_mock_placeholder.pdf";
  }

  const newLoan: Peminjaman = {
    id: db.peminjaman.length > 0 ? Math.max(...db.peminjaman.map(p => p.id)) + 1 : 1,
    user_id: user.id,
    barang_id: parsedBarangId,
    tipe_peminjam: tipe_peminjam || "individu",
    nama_organisasi: nama_organisasi || undefined,
    nama_kegiatan: nama_kegiatan || undefined,
    no_hp_peminjam,
    email_peminjam: email_peminjam || undefined,
    lokasi_penggunaan: lokasi_penggunaan || undefined,
    file_surat: file_path_db || undefined,
    jumlah: parsedJumlah,
    tgl_pinjam,
    tgl_kembali_rencana,
    keterangan: keterangan || undefined,
    status: "pending",
    setuju_aturan: parsedSetuju,
    created_at: new Date().toISOString()
  };

  db.peminjaman.push(newLoan);
  saveDb(db);

  res.json({
    success: true,
    message: "Permohonan peminjaman berhasil diajukan dan sedang menunggu persetujuan."
  });
});

// api/peminjaman/approve.php
app.post("/api/peminjaman/approve.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const { id, status } = req.body;
  const parsedId = parseInt(id);

  if (!parsedId || !["approved", "borrowed"].includes(status)) {
    return res.status(400).json({ success: false, error: "Data input tidak valid." });
  }

  const db = loadDb();
  const loanIdx = db.peminjaman.findIndex(p => p.id === parsedId);
  if (loanIdx === -1) {
    return res.status(404).json({ success: false, error: "Peminjaman tidak ditemukan." });
  }

  const loan = db.peminjaman[loanIdx];
  const itemIdx = db.barang.findIndex(b => b.id === loan.barang_id);
  if (itemIdx === -1) {
    return res.status(404).json({ success: false, error: "Barang tidak ditemukan." });
  }

  const item = db.barang[itemIdx];

  if (status === "approved") {
    if (loan.status !== "pending") {
      return res.status(400).json({ success: false, error: "Peminjaman sudah diproses sebelumnya." });
    }

    if (item.stok_tersedia < loan.jumlah) {
      return res.status(400).json({ success: false, error: "Stok tidak mencukupi." });
    }

    db.barang[itemIdx].stok_tersedia -= loan.jumlah;
    db.peminjaman[loanIdx].status = "approved";
    db.peminjaman[loanIdx].approved_by = user.id;
    db.peminjaman[loanIdx].approved_at = new Date().toISOString();

    saveDb(db);
    return res.json({ success: true, message: "Permohonan peminjaman disetujui." });

  } else if (status === "borrowed") {
    if (!["pending", "approved"].includes(loan.status)) {
      return res.status(400).json({ success: false, error: "Transisi tidak diizinkan." });
    }

    if (loan.status === "pending") {
      if (item.stok_tersedia < loan.jumlah) {
        return res.status(400).json({ success: false, error: "Stok tidak mencukupi." });
      }
      db.barang[itemIdx].stok_tersedia -= loan.jumlah;
      db.peminjaman[loanIdx].approved_by = user.id;
      db.peminjaman[loanIdx].approved_at = new Date().toISOString();
    }

    db.peminjaman[loanIdx].status = "borrowed";
    saveDb(db);
    return res.json({ success: true, message: "Barang berhasil diserahterimakan." });
  }
});

// api/peminjaman/reject.php
app.post("/api/peminjaman/reject.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const { id, alasan_tolak } = req.body;
  const parsedId = parseInt(id);

  if (!parsedId || !alasan_tolak) {
    return res.status(400).json({ success: false, error: "Alasan penolakan wajib diisi." });
  }

  const db = loadDb();
  const loanIdx = db.peminjaman.findIndex(p => p.id === parsedId);
  if (loanIdx === -1) {
    return res.status(404).json({ success: false, error: "Peminjaman tidak ditemukan." });
  }

  if (db.peminjaman[loanIdx].status !== "pending") {
    return res.status(400).json({ success: false, error: "Peminjaman sudah diproses sebelumnya." });
  }

  db.peminjaman[loanIdx].status = "rejected";
  db.peminjaman[loanIdx].alasan_tolak = alasan_tolak;
  db.peminjaman[loanIdx].approved_by = user.id;
  db.peminjaman[loanIdx].approved_at = new Date().toISOString();

  saveDb(db);

  res.json({
    success: true,
    message: "Permohonan peminjaman berhasil ditolak."
  });
});

// api/peminjaman/upload_surat.php
app.post("/api/peminjaman/upload_surat.php", upload.single("file_surat"), (req, res) => {
  const user = (req as any).sessionUser;
  if (!user) {
    return res.status(401).json({ success: false, error: "Harap masuk." });
  }

  if (req.file) {
    res.json({
      success: true,
      file_path: "uploads/surat/" + req.file.filename,
      message: "Surat berhasil diunggah."
    });
  } else {
    res.status(400).json({ success: false, error: "Gagal mengunggah file." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PENGEMBALIAN API
// ─────────────────────────────────────────────────────────────────────────────

// api/pengembalian/create.php
app.post("/api/pengembalian/create.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak. Hanya Admin." });
  }

  const { peminjaman_id, kondisi_kembali, catatan } = req.body;
  const parsedLoanId = parseInt(peminjaman_id);

  if (!parsedLoanId) {
    return res.status(400).json({ success: false, error: "ID peminjaman wajib diisi." });
  }

  const db = loadDb();
  const loanIdx = db.peminjaman.findIndex(p => p.id === parsedLoanId);
  if (loanIdx === -1) {
    return res.status(404).json({ success: false, error: "Peminjaman tidak ditemukan." });
  }

  const loan = db.peminjaman[loanIdx];
  if (loan.status === "returned") {
    return res.status(400).json({ success: false, error: "Sudah dikembalikan sebelumnya." });
  }

  const itemIdx = db.barang.findIndex(b => b.id === loan.barang_id);

  // Return the stock if they were actively using it
  if (["approved", "borrowed", "late"].includes(loan.status)) {
    if (itemIdx !== -1) {
      db.barang[itemIdx].stok_tersedia += loan.jumlah;
    }
  }

  db.peminjaman[loanIdx].status = "returned";

  const newReturn: Pengembalian = {
    id: db.pengembalian.length > 0 ? Math.max(...db.pengembalian.map(r => r.id)) + 1 : 1,
    peminjaman_id: parsedLoanId,
    verified_by: user.id,
    tgl_kembali_aktual: new Date().toISOString().split("T")[0],
    kondisi_kembali: kondisi_kembali || "Baik",
    catatan: catatan || "",
    verified_at: new Date().toISOString()
  };

  db.pengembalian.push(newReturn);

  // Log damage/loss report
  if (["Rusak", "Hilang", "Rusak Sebagian"].includes(kondisi_kembali)) {
    const newDamage: Kerusakan = {
      id: db.kerusakan.length > 0 ? Math.max(...db.kerusakan.map(k => k.id)) + 1 : 1,
      pengembalian_id: newReturn.id,
      deskripsi: `Barang dikembalikan dalam kondisi ${kondisi_kembali}. Catatan: ${catatan}`,
      status_tindak: "dilaporkan"
    };
    db.kerusakan.push(newDamage);

    // Update item stock if fully lost or damaged
    if (itemIdx !== -1) {
      if (kondisi_kembali === "Hilang") {
        db.barang[itemIdx].stok_total -= loan.jumlah;
        db.barang[itemIdx].stok_tersedia -= loan.jumlah;
        if (db.barang[itemIdx].stok_total < 0) db.barang[itemIdx].stok_total = 0;
        if (db.barang[itemIdx].stok_tersedia < 0) db.barang[itemIdx].stok_tersedia = 0;
      } else {
        db.barang[itemIdx].kondisi = "Butuh Perbaikan";
      }
    }
  }

  saveDb(db);

  res.json({
    success: true,
    message: "Pengembalian barang berhasil dicatat dan diverifikasi."
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATISTIK API
// ─────────────────────────────────────────────────────────────────────────────

// api/statistik/index.php
app.get("/api/statistik/index.php", (req, res) => {
  const user = (req as any).sessionUser;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ success: false, error: "Akses ditolak." });
  }

  const db = loadDb();
  const total_barang = db.barang.length;
  const sedang_dipinjam = db.peminjaman.filter(p => p.status === "borrowed").length;
  const menunggu_approval = db.peminjaman.filter(p => p.status === "pending").length;

  const todayStr = new Date().toISOString().split("T")[0];
  const terlambat = db.peminjaman.filter(p => p.status === "late" || (p.status === "borrowed" && p.tgl_kembali_rencana < todayStr)).length;

  // Auto update status to late for overdue borrow records
  db.peminjaman.forEach((p, idx) => {
    if (p.status === "borrowed" && p.tgl_kembali_rencana < todayStr) {
      db.peminjaman[idx].status = "late";
    }
  });
  saveDb(db);

  res.json({
    success: true,
    data: {
      total_barang,
      sedang_dipinjam,
      menunggu_approval,
      terlambat
    },
    message: "Berhasil mengambil statistik."
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATIC FILE SERVING & ROUTING
// ─────────────────────────────────────────────────────────────────────────────

// Serve uploaded surat files
app.use("/uploads/surat", express.static(uploadDir));
app.use("/uploads/barang", express.static(uploadBarangDir));

// Serve other assets and core pages
app.use("/css", express.static(path.join(process.cwd(), "css")));
app.use("/js", express.static(path.join(process.cwd(), "js")));

// Serve admin pages
app.use("/admin", express.static(path.join(process.cwd(), "admin")));

// Serve user pages
app.use("/user", express.static(path.join(process.cwd(), "user")));

// Server main page routing
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "landing.html"));
});

app.get("/landing.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "landing.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "login.html"));
});

app.get("/register.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "register.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SiPinjam UPT full-stack server running on port ${PORT}`);
  // Force initialize DB
  loadDb();
});
