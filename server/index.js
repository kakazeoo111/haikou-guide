import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import OpenApiClient from "@alicloud/openapi-client";
import DypnsapiClient from "@alicloud/dypnsapi20170525";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
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
import { registerMiniProgramRoutes } from "./miniProgramRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.SMS_SERVER_PORT || 3001;
const ADMIN_PHONE = "13707584213";
const otpStore = new Map();

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use(
  "/uploads",
  express.static(uploadDir, {
    maxAge: "30d",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    },
  }),
);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

const smsClient = new DypnsapiClient.default(
  new OpenApiClient.Config({
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    endpoint: "dypnsapi.aliyuncs.com",
  }),
);

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

app.get("/api/health", (req, res) => res.json({ ok: true, db: "connected" }));

try {
  await ensureBadgeGrantTable(pool);
} catch (error) {
  console.error("称号授权表初始化失败:", error.message);
}

registerBadgeRoutes(app, { pool, ADMIN_PHONE });
registerAuthRoutes(app, { pool, otpStore, smsClient });
registerRecommendationRoutes(app, { pool, upload, addNotice });
registerPlaceCommentRoutes(app, { pool, upload, addNotice });
registerNotificationRoutes(app, { pool });
registerMiscRoutes(app, { pool, upload, ADMIN_PHONE });
registerUserSummaryRoutes(app, { pool });
await registerMiniProgramRoutes(app, { pool, otpStore, smsClient });

try {
  await registerFeedbackRoutes(app, { pool, upload, ADMIN_PHONE });
} catch (error) {
  console.error("反馈管理路由初始化失败:", error.message);
}
try {
  await registerForumRoutes(app, { pool, upload });
} catch (error) {
  console.error("论坛路由初始化失败:", error.message);
}
try {
  registerOnlineRoutes(app);
} catch (error) {
  console.error("在线人数路由初始化失败:", error.message);
}

app.listen(port, () => console.log(`🚀 后端已启动：${port}`));
