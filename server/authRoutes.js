import bcrypt from "bcryptjs";
import DypnsapiClient from "@alicloud/dypnsapi20170525";

function createSmsCode() {
  return Math.floor(100000 + Math.random() * 899999).toString();
}

function isOtpRecordValid(record, code) {
  if (!record) return false;
  if (record.code !== code) return false;
  return Date.now() <= record.expiresAt;
}

function saveOtpRecord(otpStore, phone, code) {
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
}

export function registerAuthRoutes(app, { pool, otpStore, smsClient }) {
  app.post("/api/sms/send", async (req, res) => {
    const { phone, type } = req.body;
    try {
      const [rows] = await pool.execute("SELECT id FROM users WHERE phone = ?", [phone]);
      if (type === "register" && rows.length > 0) {
        return res.status(400).json({ ok: false, message: "该手机号已注册" });
      }
      if (type === "reset" && rows.length === 0) {
        return res.status(400).json({ ok: false, message: "用户未注册" });
      }
      const code = createSmsCode();
      const sendRequest = new DypnsapiClient.SendSmsVerifyCodeRequest({
        phoneNumber: phone,
        signName: process.env.ALIBABA_CLOUD_SMS_SIGN_NAME,
        templateCode: process.env.ALIBABA_CLOUD_SMS_TEMPLATE_CODE,
        templateParam: JSON.stringify({ code }),
      });
      const result = await smsClient.sendSmsVerifyCode(sendRequest);
      if (result.body.code !== "OK") {
        return res.status(400).json({ ok: false, message: result.body.message });
      }
      saveOtpRecord(otpStore, phone, code);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { username, phone, password, code } = req.body;
    const record = otpStore.get(phone);
    if (!isOtpRecordValid(record, code)) {
      return res.status(401).json({ ok: false, message: "验证码错误" });
    }
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.execute("INSERT INTO users (username, phone, password_hash) VALUES (?, ?, ?)", [username, phone, passwordHash]);
      otpStore.delete(phone);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { phone, password } = req.body;
    try {
      const [rows] = await pool.execute("SELECT * FROM users WHERE phone = ?", [phone]);
      if (rows.length === 0) {
        return res.status(401).json({ ok: false, message: "用户未注册" });
      }
      const matched = await bcrypt.compare(password, rows[0].password_hash);
      if (!matched) return res.status(401).json({ ok: false, message: "密码错误" });
      res.json({
        ok: true,
        user: { username: rows[0].username, phone: rows[0].phone, avatar_url: rows[0].avatar_url },
      });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { phone, password, code } = req.body;
    const record = otpStore.get(phone);
    if (!isOtpRecordValid(record, code)) {
      return res.status(401).json({ ok: false, message: "验证码错误" });
    }
    try {
      const [rows] = await pool.execute("SELECT id FROM users WHERE phone = ?", [phone]);
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, message: "用户未注册" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.execute("UPDATE users SET password_hash = ? WHERE phone = ?", [passwordHash, phone]);
      otpStore.delete(phone);
      res.json({ ok: true, message: "密码重置成功" });
    } catch (error) {
      res.status(500).json({ ok: false, message: "密码重置失败" });
    }
  });
}
