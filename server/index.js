import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import OpenApiClient from "@alicloud/openapi-client";
import DypnsapiClient from "@alicloud/dypnsapi20170525";
import path from 'path';
import { fileURLToPath } from 'url';
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.SMS_SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

const config = new OpenApiClient.Config({
  accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  endpoint: "dypnsapi.aliyuncs.com",
});
const client = new DypnsapiClient.default(config);
const otpStore = new Map();
const ADMIN_PHONE = "13707584213";

app.get("/api/health", (req, res) => res.json({ ok: true, db: "connected" }));

// --- 认证接口 ---
app.post("/api/sms/send", async (req, res) => {
  const { phone, type } = req.body;
  try {
    const [rows] = await pool.execute('SELECT id FROM users WHERE phone = ?', [phone]);
    if (type === 'register' && rows.length > 0) return res.status(400).json({ ok: false, message: "该手机号已注册" });
    const code = Math.floor(100000 + Math.random() * 899999).toString();
    const sendRequest = new DypnsapiClient.SendSmsVerifyCodeRequest({
      phoneNumber: phone, signName: process.env.ALIBABA_CLOUD_SMS_SIGN_NAME,
      templateCode: process.env.ALIBABA_CLOUD_SMS_TEMPLATE_CODE,
      templateParam: JSON.stringify({ code })
    });
    const result = await client.sendSmsVerifyCode(sendRequest);
    if (result.body.code === "OK") {
      otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
      res.json({ ok: true });
    } else { res.status(400).json({ ok: false, message: result.body.message }); }
  } catch (error) { res.status(500).json({ ok: false, message: error.message }); }
});

app.post("/api/auth/register", async (req, res) => {
  const { username, phone, password, code } = req.body;
  const record = otpStore.get(phone);
  if (!record || record.code !== code || Date.now() > record.expiresAt) return res.status(401).json({ ok: false, message: "验证码错误" });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO users (username, phone, password_hash) VALUES (?, ?, ?)', [username, phone, passwordHash]);
    otpStore.delete(phone);
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ ok: false }); }
});

app.post("/api/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (rows.length === 0) return res.status(401).json({ ok: false, message: "用户未注册" });
    if (!(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ ok: false, message: "密码错误" });
    res.json({ ok: true, user: { username: rows[0].username, phone: rows[0].phone, avatar_url: rows[0].avatar_url } });
  } catch (error) { res.status(500).json({ ok: false }); }
});

// --- 用户推荐功能接口 ---
app.get("/api/recommendations", async (req, res) => {
    const { phone } = req.query;
    try {
        const sql = `
            SELECT r.*, u.username, u.avatar_url,
            (SELECT COUNT(*) FROM recommendation_likes WHERE recommendation_id = r.id) as like_count,
            (SELECT COUNT(*) FROM recommendation_likes WHERE recommendation_id = r.id AND phone = ?) as is_liked
            FROM recommendations r
            JOIN users u ON r.user_phone = u.phone
            ORDER BY r.created_at DESC`;
        const [rows] = await pool.execute(sql, [phone || '']);
        const data = rows.map(r => ({ ...r, is_liked: r.is_liked > 0 }));
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false }); }
});

app.post("/api/recommendations/add", upload.single('image'), async (req, res) => {
    const { phone, place_name, description, lat, lng } = req.body;
    const imageUrl = req.file ? `https://api.suzcore.top/uploads/${req.file.filename}` : null;
    try {
        await pool.execute(
            'INSERT INTO recommendations (user_phone, place_name, description, lat, lng, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [phone, place_name, description || "", lat, lng, imageUrl]
        );
        res.json({ ok: true, message: "推荐成功！" });
    } catch (e) { res.status(500).json({ ok: false }); }
});

// 在 index.js 中找到此接口并替换
app.post("/api/recommendations/like", async (req, res) => {
    const { phone, recId } = req.body;
    try {
        // 确保 recId 是数字
        const id = parseInt(recId);
        const [rows] = await pool.execute(
            'SELECT id FROM recommendation_likes WHERE phone = ? AND recommendation_id = ?', 
            [phone, id]
        );
        
        if (rows.length > 0) {
            await pool.execute(
                'DELETE FROM recommendation_likes WHERE phone = ? AND recommendation_id = ?', 
                [phone, id]
            );
            res.json({ ok: true, action: "unliked" });
        } else {
            await pool.execute(
                'INSERT INTO recommendation_likes (phone, recommendation_id) VALUES (?, ?)', 
                [phone, id]
            );
            res.json({ ok: true, action: "liked" });
        }
    } catch (e) {
        console.error("推荐点赞失败:", e.message);
        res.status(500).json({ ok: false, message: e.message });
    }
});

// --- 原有点赞与评论接口（已加入安全防护） ---
app.get("/api/places/stats", async (req, res) => {
    const { phone } = req.query;
    try {
        const [statsRows] = await pool.execute('SELECT place_id, COUNT(*) as count FROM place_likes GROUP BY place_id');
        const [myLikes] = await pool.execute('SELECT place_id FROM place_likes WHERE phone = ?', [phone || '']);
        const statsMap = {};
        statsRows.forEach(row => statsMap[row.place_id] = row.count);
        res.json({ ok: true, stats: statsMap, myLikedIds: myLikes.map(r => r.place_id) });
    } catch (e) { res.status(500).json({ ok: false }); }
});

app.post("/api/places/like", async (req, res) => {
    const { phone, placeId } = req.body;
    try {
        const [rows] = await pool.execute('SELECT id FROM place_likes WHERE phone = ? AND place_id = ?', [phone, placeId]);
        if (rows.length > 0) await pool.execute('DELETE FROM place_likes WHERE phone = ? AND place_id = ?', [phone, placeId]);
        else await pool.execute('INSERT INTO place_likes (phone, place_id) VALUES (?, ?)', [phone, placeId]);
        const [countRow] = await pool.execute('SELECT COUNT(*) as count FROM place_likes WHERE place_id = ?', [placeId]);
        res.json({ ok: true, newCount: countRow[0].count });
    } catch (e) { res.status(500).json({ ok: false }); }
});

// 获取评论 - 增加 try-catch 保护
app.get("/api/comments/:placeId", async (req, res) => {
    const { phone } = req.query;
    const placeId = req.params.placeId;
    try {
        const sql = `SELECT c.*, u.username, u.avatar_url, 
                    (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as like_count, 
                    (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND phone = ?) as is_liked 
                    FROM comments c 
                    JOIN users u ON c.user_phone = u.phone 
                    WHERE c.place_id = ? 
                    ORDER BY c.created_at ASC`;
        const [rows] = await pool.execute(sql, [phone || '', placeId]);
        res.json({ ok: true, comments: rows.map(r => ({ ...r, is_liked: r.is_liked > 0 })) });
    } catch (e) { 
        console.error("获取评论失败:", e);
        res.status(500).json({ ok: false, message: "获取评论失败" }); 
    }
});

// 点赞评论 - 增加 try-catch 保护
app.post("/api/comments/like", async (req, res) => {
    try {
        const { phone, commentId } = req.body;
        const [rows] = await pool.execute('SELECT id FROM comment_likes WHERE phone = ? AND comment_id = ?', [phone, commentId]);
        if (rows.length > 0) await pool.execute('DELETE FROM comment_likes WHERE phone = ? AND comment_id = ?', [phone, commentId]);
        else await pool.execute('INSERT INTO comment_likes (phone, comment_id) VALUES (?, ?)', [phone, commentId]);
        res.json({ ok: true });
    } catch (e) {
        console.error("点赞评论失败:", e);
        res.status(500).json({ ok: false });
    }
});

// 发布评论 - 【重点修正：增加 try-catch，防止进程崩溃】
app.post("/api/comments/add", upload.single('image'), async (req, res) => {
  try {
    // 增加 parentId 的解构
    const { phone, placeId, content, parentId } = req.body; 
    const imageUrl = req.file ? `https://api.suzcore.top/uploads/${req.file.filename}` : null;
    
    // 写入数据库，包含 parent_id
    await pool.execute(
        'INSERT INTO comments (place_id, user_phone, content, image_url, parent_id) VALUES (?, ?, ?, ?, ?)', 
        [placeId, phone, content || "", imageUrl, parentId || null]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("发布评论报错:", e.message);
    res.status(500).json({ ok: false });
  }
});

app.post("/api/comments/delete", async (req, res) => {
  try {
    const { phone, commentId } = req.body;
    await pool.execute('DELETE FROM comments WHERE id = ? AND user_phone = ?', [commentId, phone]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false }); }
});

// --- 其他接口 (保持不变但建议也加上 try-catch) ---
app.get("/api/announcement", async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT content FROM announcements WHERE id = 1');
    res.json({ ok: true, content: rows[0]?.content || "暂无公告" });
  } catch (e) { res.status(500).json({ ok: false }); }
});

app.post("/api/announcement/update", async (req, res) => {
  const { phone, newContent } = req.body;
  if (phone !== ADMIN_PHONE) return res.status(403).json({ ok: false });
  try {
    await pool.execute('UPDATE announcements SET content = ? WHERE id = 1', [newContent]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false }); }
});

app.post("/api/feedback/submit", upload.single('image'), async (req, res) => {
  try {
    const { phone, content } = req.body;
    const imageUrl = req.file ? `https://api.suzcore.top/uploads/${req.file.filename}` : null;
    await pool.execute('INSERT INTO feedback (phone, content, image_url) VALUES (?, ?, ?)', [phone, content || "", imageUrl]);
    res.json({ ok: true, message: "反馈已收到" });
  } catch (e) { res.status(500).json({ ok: false }); }
});

app.post("/api/feedback/all", async (req, res) => {
  const { phone } = req.body;
  if (phone !== ADMIN_PHONE) return res.status(403).json({ ok: false });
  try {
    const [rows] = await pool.execute('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json({ ok: true, data: rows });
  } catch (e) { res.status(500).json({ ok: false }); }
});

app.post("/api/user/upload-avatar", upload.single('avatar'), async (req, res) => {
  try {
    const { phone } = req.body;
    const imageUrl = `https://api.suzcore.top/uploads/${req.file.filename}`;
    await pool.execute('UPDATE users SET avatar_url = ? WHERE phone = ?', [imageUrl, phone]);
    res.json({ ok: true, avatarUrl: imageUrl });
  } catch (e) { res.status(500).json({ ok: false }); }
});

app.get("/api/favorites/:phone", async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT place_id FROM favorites WHERE user_phone = ?', [req.params.phone]);
    res.json({ ok: true, favIds: rows.map(r => r.place_id) });
  } catch (e) { res.status(500).json({ ok: false }); }
});

app.post("/api/favorites/toggle", async (req, res) => {
    try {
        const { phone, placeId } = req.body;
        const pId = String(placeId); // ✅ 强制转为字符串，防止混合类型导致SQL崩溃

        // 1. 先查有没有
        const [rows] = await pool.execute(
            'SELECT id FROM favorites WHERE user_phone = ? AND place_id = ?', 
            [phone, pId]
        );

        if (rows.length > 0) {
            // 2. 有就删掉
            await pool.execute(
                'DELETE FROM favorites WHERE user_phone = ? AND place_id = ?', 
                [phone, pId]
            );
            res.json({ ok: true, action: 'removed' });
        } else {
            // 3. 没有就存入
            await pool.execute(
                'INSERT INTO favorites (user_phone, place_id) VALUES (?, ?)', 
                [phone, pId]
            );
            res.json({ ok: true, action: 'added' });
        }
    } catch (e) {
        console.error("收藏切换失败:", e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post("/api/recommendations/delete", async (req, res) => {
    const { phone, recId } = req.body;
    try {
        const [result] = await pool.execute('DELETE FROM recommendations WHERE id = ? AND user_phone = ?', [recId, phone]);
        res.json({ ok: result.affectedRows > 0 });
    } catch (e) { res.status(500).json({ ok: false }); }
});

app.listen(port, () => console.log(`🚀 后端已启动：${port}`));