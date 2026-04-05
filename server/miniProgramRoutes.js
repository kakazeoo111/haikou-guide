import bcrypt from "bcryptjs";
import { fetchOpenIdByLoginCode } from "./wechatMiniService.js";

const PHONE_REGEX = /^1\d{10}$/;
const DEFAULT_CHANCE_GAIN = 1;
const VIRTUAL_PHONE_PREFIX = "17";
const LOTTERY_PRIZES = [
  { key: "coupon_5", name: "5元饮品券", weight: 35 },
  { key: "coupon_10", name: "10元餐饮券", weight: 15 },
  { key: "points_88", name: "88积分", weight: 25 },
  { key: "try_again", name: "谢谢参与", weight: 25 },
];

function isPhoneValid(phone) {
  return PHONE_REGEX.test(String(phone || "").trim());
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(dateStr, offsetDays) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return formatDate(date);
}

function pickPrize() {
  const totalWeight = LOTTERY_PRIZES.reduce((sum, item) => sum + item.weight, 0);
  const random = Math.random() * totalWeight;
  let running = 0;
  for (const prize of LOTTERY_PRIZES) {
    running += prize.weight;
    if (random <= running) return prize;
  }
  return LOTTERY_PRIZES[LOTTERY_PRIZES.length - 1];
}

function openIdToDigits(openId) {
  const source = String(openId || "");
  let digits = "";
  for (const char of source) digits += String(char.charCodeAt(0) % 10);
  return digits.padEnd(9, "0").slice(0, 9);
}

function buildVirtualPhone(baseDigits, offset) {
  const baseNumber = Number(baseDigits);
  const range = 10 ** 9;
  const next = (baseNumber + offset) % range;
  return `${VIRTUAL_PHONE_PREFIX}${String(next).padStart(9, "0")}`;
}

async function ensureMiniProgramTables(pool) {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS mini_user_assets (
      user_phone VARCHAR(20) NOT NULL,
      draw_chances INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_phone),
      KEY idx_mini_user_assets_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS mini_sign_logs (
      id INT NOT NULL AUTO_INCREMENT,
      user_phone VARCHAR(20) NOT NULL,
      sign_date DATE NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_mini_sign_user_date (user_phone, sign_date),
      KEY idx_mini_sign_user_created (user_phone, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS mini_lottery_logs (
      id INT NOT NULL AUTO_INCREMENT,
      user_phone VARCHAR(20) NOT NULL,
      prize_key VARCHAR(40) NOT NULL,
      prize_name VARCHAR(100) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_mini_lottery_user_created (user_phone, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS mini_user_openid_bindings (
      open_id VARCHAR(100) NOT NULL,
      user_phone VARCHAR(20) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (open_id),
      UNIQUE KEY uk_mini_openid_phone (user_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

async function ensureAssetRow(pool, phone) {
  await pool.execute(
    "INSERT INTO mini_user_assets (user_phone, draw_chances) VALUES (?, 0) ON DUPLICATE KEY UPDATE user_phone = VALUES(user_phone)",
    [phone]
  );
}

async function queryDrawChances(pool, phone) {
  const [rows] = await pool.execute("SELECT draw_chances FROM mini_user_assets WHERE user_phone = ? LIMIT 1", [phone]);
  return Number(rows?.[0]?.draw_chances || 0);
}

async function querySignDates(pool, phone) {
  const [rows] = await pool.execute(
    "SELECT sign_date FROM mini_sign_logs WHERE user_phone = ? ORDER BY sign_date DESC LIMIT 366",
    [phone]
  );
  return rows.map((row) => formatDate(new Date(row.sign_date)));
}

async function querySignSummary(pool, phone) {
  const [countRows, todayRows] = await Promise.all([
    pool.execute("SELECT COUNT(*) AS count FROM mini_sign_logs WHERE user_phone = ?", [phone]),
    pool.execute("SELECT id FROM mini_sign_logs WHERE user_phone = ? AND sign_date = CURDATE() LIMIT 1", [phone]),
  ]);
  const totalSignedDays = Number(countRows[0]?.[0]?.count || 0);
  const signedToday = todayRows[0].length > 0;
  const allSignDates = await querySignDates(pool, phone);
  const signedSet = new Set(allSignDates);
  const baseDate = formatDate(new Date());
  let streakAnchor = signedToday ? baseDate : shiftDate(baseDate, -1);
  let continuousDays = 0;
  while (signedSet.has(streakAnchor)) {
    continuousDays += 1;
    streakAnchor = shiftDate(streakAnchor, -1);
  }
  return { signedToday, totalSignedDays, continuousDays };
}

async function ensureUserByPhone(pool, phone) {
  const [rows] = await pool.execute("SELECT phone, username, avatar_url FROM users WHERE phone = ? LIMIT 1", [phone]);
  if (rows.length > 0) return rows[0];
  const username = `用户${String(phone).slice(-4)}`;
  const passwordHash = await bcrypt.hash(`mp-${phone}-${Date.now()}`, 10);
  await pool.execute("INSERT INTO users (username, phone, password_hash) VALUES (?, ?, ?)", [username, phone, passwordHash]);
  return { phone, username, avatar_url: "" };
}

async function findOrCreatePhoneByOpenId(pool, openId) {
  const [existing] = await pool.execute("SELECT user_phone FROM mini_user_openid_bindings WHERE open_id = ? LIMIT 1", [openId]);
  if (existing.length > 0) return String(existing[0].user_phone);

  const digits = openIdToDigits(openId);
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const phone = buildVirtualPhone(digits, attempt);
    const [phoneRows] = await pool.execute("SELECT open_id FROM mini_user_openid_bindings WHERE user_phone = ? LIMIT 1", [phone]);
    if (phoneRows.length > 0) continue;
    try {
      await pool.execute("INSERT INTO mini_user_openid_bindings (open_id, user_phone) VALUES (?, ?)", [openId, phone]);
      return phone;
    } catch (error) {
      if (String(error?.code || "") === "ER_DUP_ENTRY") continue;
      throw error;
    }
  }
  throw new Error("虚拟手机号分配失败，请重试");
}

export async function registerMiniProgramRoutes(app, { pool }) {
  await ensureMiniProgramTables(pool);

  app.post("/api/mp/auth/login-by-wechat", async (req, res) => {
    const wxCode = String(req.body?.wxCode || "").trim();
    if (!wxCode) return res.status(400).json({ ok: false, message: "wxCode 不能为空" });
    try {
      const openId = await fetchOpenIdByLoginCode(wxCode);
      const phone = await findOrCreatePhoneByOpenId(pool, openId);
      const user = await ensureUserByPhone(pool, phone);
      await ensureAssetRow(pool, phone);
      const drawChances = await queryDrawChances(pool, phone);
      res.json({ ok: true, data: { phone: user.phone, username: user.username || phone, avatar_url: user.avatar_url || "", drawChances } });
    } catch (error) {
      console.error("小程序一键登录失败:", error.message);
      res.status(500).json({ ok: false, message: `一键登录失败: ${error.message}` });
    }
  });

  app.get("/api/mp/sign/status", async (req, res) => {
    const phone = String(req.query?.phone || "").trim();
    if (!isPhoneValid(phone)) return res.status(400).json({ ok: false, message: "用户令牌无效" });
    try {
      await ensureAssetRow(pool, phone);
      const [signSummary, drawChances] = await Promise.all([querySignSummary(pool, phone), queryDrawChances(pool, phone)]);
      res.json({ ok: true, data: { ...signSummary, drawChances } });
    } catch (error) {
      console.error("小程序签到状态查询失败:", error.message);
      res.status(500).json({ ok: false, message: `签到状态查询失败: ${error.message}` });
    }
  });

  app.post("/api/mp/sign/checkin", async (req, res) => {
    const phone = String(req.body?.phone || "").trim();
    if (!isPhoneValid(phone)) return res.status(400).json({ ok: false, message: "用户令牌无效" });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [signedRows] = await connection.execute(
        "SELECT id FROM mini_sign_logs WHERE user_phone = ? AND sign_date = CURDATE() LIMIT 1 FOR UPDATE",
        [phone]
      );
      if (signedRows.length > 0) {
        await connection.rollback();
        return res.status(400).json({ ok: false, message: "今天已经签到过了" });
      }
      await connection.execute("INSERT INTO mini_sign_logs (user_phone, sign_date) VALUES (?, CURDATE())", [phone]);
      await connection.execute(
        "INSERT INTO mini_user_assets (user_phone, draw_chances) VALUES (?, ?) ON DUPLICATE KEY UPDATE draw_chances = draw_chances + VALUES(draw_chances)",
        [phone, DEFAULT_CHANCE_GAIN]
      );
      await connection.commit();
      const [signSummary, drawChances] = await Promise.all([querySignSummary(pool, phone), queryDrawChances(pool, phone)]);
      res.json({ ok: true, message: "签到成功", data: { ...signSummary, drawChances } });
    } catch (error) {
      await connection.rollback();
      console.error("小程序签到失败:", error.message);
      res.status(500).json({ ok: false, message: `签到失败: ${error.message}` });
    } finally {
      connection.release();
    }
  });

  app.get("/api/mp/lottery/prizes", (req, res) => {
    res.json({ ok: true, data: LOTTERY_PRIZES.map(({ key, name }) => ({ key, name })) });
  });

  app.post("/api/mp/lottery/spin", async (req, res) => {
    const phone = String(req.body?.phone || "").trim();
    if (!isPhoneValid(phone)) return res.status(400).json({ ok: false, message: "用户令牌无效" });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [assetRows] = await connection.execute("SELECT draw_chances FROM mini_user_assets WHERE user_phone = ? LIMIT 1 FOR UPDATE", [phone]);
      const currentChances = Number(assetRows?.[0]?.draw_chances || 0);
      if (currentChances <= 0) {
        await connection.rollback();
        return res.status(400).json({ ok: false, message: "抽奖机会不足，请先签到" });
      }
      const prize = pickPrize();
      await connection.execute("UPDATE mini_user_assets SET draw_chances = draw_chances - 1 WHERE user_phone = ?", [phone]);
      await connection.execute("INSERT INTO mini_lottery_logs (user_phone, prize_key, prize_name) VALUES (?, ?, ?)", [phone, prize.key, prize.name]);
      await connection.commit();
      const drawChances = await queryDrawChances(pool, phone);
      res.json({ ok: true, data: { prize, drawChances } });
    } catch (error) {
      await connection.rollback();
      console.error("小程序抽奖失败:", error.message);
      res.status(500).json({ ok: false, message: `抽奖失败: ${error.message}` });
    } finally {
      connection.release();
    }
  });

  app.get("/api/mp/lottery/logs", async (req, res) => {
    const phone = String(req.query?.phone || "").trim();
    if (!isPhoneValid(phone)) return res.status(400).json({ ok: false, message: "用户令牌无效" });
    try {
      const [rows] = await pool.execute(
        `SELECT id, prize_key, prize_name, created_at
         FROM mini_lottery_logs
         WHERE user_phone = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 20`,
        [phone]
      );
      res.json({ ok: true, data: rows });
    } catch (error) {
      console.error("小程序抽奖记录查询失败:", error.message);
      res.status(500).json({ ok: false, message: `抽奖记录查询失败: ${error.message}` });
    }
  });
}
