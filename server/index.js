import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import OpenApiClient from "@alicloud/openapi-client";
import DypnsapiClient from "@alicloud/dypnsapi20170525";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { ensureBadgeGrantTable } from "./badgesService.js";
import { registerBadgeRoutes } from "./badgesRoutes.js";
import { registerFeedbackRoutes } from "./feedbackRoutes.js";
import { registerForumRoutes } from "./forumRoutes.js";
import { registerOnlineRoutes } from "./onlineRoutes.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerRecommendationRoutes } from "./recommendationRoutes.js";
import { registerPlaceCommentRoutes } from "./placeCommentRoutes.js";
import { registerNotificationRoutes } from "./notificationRoutes.js";
import { registerMiscRoutes } from "./miscRoutes.js";
import { registerUserSummaryRoutes } from "./userSummaryRoutes.js";
import { applyProxySettings, setApiNoStoreHeaders, STATIC_UPLOAD_OPTIONS } from "./cacheHeaders.js";
import { createUploadMiddleware } from "./uploadPolicy.js";
import { createOptionalAuthMiddleware, createRequireAdminMiddleware, createRequireAuthMiddleware } from "./authToken.js";
import { createRateLimiter } from "./rateLimit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.SMS_SERVER_PORT || 3001;
const ADMIN_PHONE = "13707584213";
const otpStore = new Map();
const startupWarnings = [];
const requireAuth = createRequireAuthMiddleware();
const optionalAuth = createOptionalAuthMiddleware();
const requireAdmin = createRequireAdminMiddleware(ADMIN_PHONE);

function parseAllowedOrigins() {
  return String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function createCorsOptions() {
  const allowedOrigins = new Set(parseAllowedOrigins());
  const allowDevFallback = allowedOrigins.size === 0 && process.env.NODE_ENV !== "production";
  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = String(origin || "").replace(/\/+$/, "");
      if (allowDevFallback || allowedOrigins.has(normalizedOrigin)) return callback(null, true);
      return callback(new Error("CORS origin is not allowed"));
    },
  };
}

function setSecurityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), payment=()");
  next();
}

applyProxySettings(app);
app.disable("x-powered-by");
app.use(setSecurityHeaders);
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "256kb" }));
app.use(
  "/api",
  createRateLimiter({
    windowMs: 60 * 1000,
    max: Number(process.env.API_RATE_LIMIT_PER_MINUTE || 300),
    keyGenerator: (req) => req.ip,
  }),
);
app.use("/api", setApiNoStoreHeaders);

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir, STATIC_UPLOAD_OPTIONS));

const upload = createUploadMiddleware(uploadDir);

function getPositiveIntEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getNonNegativeIntEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

async function runStartupStep(label, task) {
  try {
    await task();
  } catch (error) {
    startupWarnings.push(label);
    console.error(`${label}失败:`, error.message);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: getPositiveIntEnv("DB_POOL_CONNECTION_LIMIT", 6),
  maxIdle: getPositiveIntEnv("DB_POOL_MAX_IDLE", 4),
  idleTimeout: getPositiveIntEnv("DB_POOL_IDLE_TIMEOUT_MS", 60000),
  queueLimit: getNonNegativeIntEnv("DB_POOL_QUEUE_LIMIT", 0),
  enableKeepAlive: true,
  keepAliveInitialDelay: getNonNegativeIntEnv("DB_POOL_KEEPALIVE_DELAY_MS", 10000),
});

const smsClient = new DypnsapiClient.default(
  new OpenApiClient.Config({
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    endpoint: "dypnsapi.aliyuncs.com",
  }),
);

async function ensureUsersProfileColumns(pool) {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_users_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  const [avatarRows] = await pool.execute("SHOW COLUMNS FROM users LIKE 'avatar_url'");
  if (avatarRows.length === 0) {
    await pool.execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER password_hash");
  }
}

async function addNotice(receiver, sender, type, placeId, content = "") {
  if (receiver === sender) return;
  try {
    await pool.execute(
      "INSERT INTO notifications (receiver_phone, sender_phone, type, place_id, content) VALUES (?, ?, ?, ?, ?)",
      [receiver, sender, type, placeId, content],
    );
  } catch (error) {
    console.error("发送通知失败:", error.message);
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    server: "running",
    db: startupWarnings.length > 0 ? "unavailable" : "initialized",
    startupWarnings,
  });
});

await runStartupStep("用户资料字段初始化", () => ensureUsersProfileColumns(pool));
await runStartupStep("称号授权表初始化", () => ensureBadgeGrantTable(pool));
await runStartupStep("称号路由初始化", () => registerBadgeRoutes(app, { pool, ADMIN_PHONE, requireAuth, requireAdmin }));
await runStartupStep("认证路由初始化", () => registerAuthRoutes(app, { pool, otpStore, smsClient, requireAuth }));
await runStartupStep("推荐路由初始化", () => registerRecommendationRoutes(app, { pool, upload, addNotice, requireAuth, optionalAuth }));
await runStartupStep("评论路由初始化", () => registerPlaceCommentRoutes(app, { pool, upload, addNotice, requireAuth, optionalAuth }));
await runStartupStep("通知路由初始化", () => registerNotificationRoutes(app, { pool, requireAuth }));
await runStartupStep("杂项路由初始化", () => registerMiscRoutes(app, { pool, upload, ADMIN_PHONE, requireAuth, requireAdmin }));
await runStartupStep("用户摘要路由初始化", () => registerUserSummaryRoutes(app, { pool }));
await runStartupStep("反馈管理路由初始化", () => registerFeedbackRoutes(app, { pool, upload, ADMIN_PHONE, requireAuth, requireAdmin }));
await runStartupStep("论坛路由初始化", () => registerForumRoutes(app, { pool, upload, addNotice, requireAuth, optionalAuth }));
await runStartupStep("在线人数路由初始化", () => registerOnlineRoutes(app, { optionalAuth }));

app.use((error, req, res, next) => {
  if (!error) return next();
  const isUploadError = error.name === "MulterError" || error.message.includes("上传");
  console.error("请求处理失败:", error.message);
  res.status(isUploadError ? 400 : 500).json({ ok: false, message: isUploadError ? error.message : "服务器处理失败" });
});

app.listen(port, () => console.log(`🚀 后端已启动：${port}`));
