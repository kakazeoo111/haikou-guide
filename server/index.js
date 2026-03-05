import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise"; // 引入 MySQL 异步库
import bcrypt from "bcryptjs";      // 引入密码加密库
import OpenApiClient from "@alicloud/openapi-client";
import DypnsapiClient from "@alicloud/dypnsapi20170525";

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.send("<h1>海口地图后端服务已就绪！</h1>"));

// --- 1. MySQL 数据库连接池 ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD, // 你的数据库密码
  database: process.env.DB_NAME || 'haikou_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- 2. 阿里云 SDK 初始化 ---
const config = new OpenApiClient.Config({
  accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  endpoint: "dypnsapi.aliyuncs.com",
});
const client = new DypnsapiClient.default(config);

// 内存存储验证码（仅用于注册时的临时校验，5分钟有效）
const otpStore = new Map();

// --- 3. 工具函数 ---
const isChinaPhoneValid = (phone) => /^1\d{10}$/.test(phone);

// --- 4. 接口 A：发送注册验证码 ---
app.post("/api/sms/send", async (req, res) => {
  const { phone } = req.body;

  if (!isChinaPhoneValid(phone)) {
    return res.status(400).json({ ok: false, message: "手机号格式不正确" });
  }

  try {
    // 【关键】注册前先查数据库，看手机号是否已被占用
    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ ok: false, message: "该手机号已注册，请直接登录" });
    }

    // 生成 6 位验证码
    const code = Math.floor(100000 + Math.random() * 899999).toString();

    const sendRequest = new DypnsapiClient.SendSmsVerifyCodeRequest({
      phoneNumber: phone,
      signName: "速通互联验证码",
      templateCode: "100001",
      schemeName: process.env.ALIBABA_CLOUD_SCHEME_NAME,
      templateParam: JSON.stringify({ code: code, min: "5" })
    });

    const result = await client.sendSmsVerifyCode(sendRequest);

    if (result.body.code === "OK") {
      otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
      console.log(`短信已发至 ${phone}: ${code}`);
      res.json({ ok: true, message: "验证码已发送" });
    } else {
      res.status(400).json({ ok: false, message: result.body.message });
    }
  } catch (error) {
    res.status(500).json({ ok: false, message: "发送异常", detail: error.message });
  }
});

// --- 5. 接口 B：新用户注册 ---
app.post("/api/auth/register", async (req, res) => {
  const { username, phone, password, code } = req.body;

  // 1. 验证码核验
  const record = otpStore.get(phone);
  if (!record || record.code !== code || Date.now() > record.expiresAt) {
    return res.status(401).json({ ok: false, message: "验证码错误或已过期" });
  }

  try {
    // 2. 密码加密（不能存明文！）
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. 写入 MySQL
    await pool.execute(
      'INSERT INTO users (username, phone, password_hash) VALUES (?, ?, ?)',
      [username, phone, passwordHash]
    );

    otpStore.delete(phone); // 注册成功，销毁验证码
    console.log(`✅ 新用户注册成功: ${username}`);
    res.json({ ok: true, message: "注册成功，请去登录" });
  } catch (error) {
    console.error("数据库写入失败:", error);
    res.status(500).json({ ok: false, message: "该手机号可能已被注册" });
  }
});

// --- 6. 接口 C：密码登录 ---
app.post("/api/auth/login", async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ ok: false, message: "手机号和密码不能为空" });
  }

  try {
    // 1. 从数据库查找用户
    const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    
    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: "用户未注册，请先注册" });
    }

    const user = rows[0];

    // 2. 使用 bcrypt 比对密码
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ ok: false, message: "密码错误" });
    }

    // 3. 登录成功
    console.log(`🎉 用户登录成功: ${user.username}`);
    res.json({
      ok: true,
      message: "登录成功",
      user: { username: user.username, phone: user.phone }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: "服务器内部错误" });
  }
});


// --- 接口：获取当前用户的所有收藏 ID ---
app.get("/api/favorites/:phone", async (req, res) => {
  const { phone } = req.params;
  try {
    const [rows] = await pool.execute(
      'SELECT place_id FROM favorites WHERE user_phone = ?',
      [phone]
    );
    // 只返回 ID 数组，例如 [1, 5, 12]
    const favIds = rows.map(row => row.place_id);
    res.json({ ok: true, favIds });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// --- 接口：切换收藏状态 (添加/删除) ---
app.post("/api/favorites/toggle", async (req, res) => {
  const { phone, placeId } = req.body;

  try {
    // 1. 先检查是否已收藏
    const [rows] = await pool.execute(
      'SELECT id FROM favorites WHERE user_phone = ? AND place_id = ?',
      [phone, placeId]
    );

    if (rows.length > 0) {
      // 已收藏 -> 取消收藏
      await pool.execute(
        'DELETE FROM favorites WHERE user_phone = ? AND place_id = ?',
        [phone, placeId]
      );
      res.json({ ok: true, action: "removed" });
    } else {
      // 未收藏 -> 添加收藏
      await pool.execute(
        'INSERT INTO favorites (user_phone, place_id) VALUES (?, ?)',
        [phone, placeId]
      );
      res.json({ ok: true, action: "added" });
    }
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 后端服务已启动: http://localhost:${port}`);
});