import bcrypt from "bcryptjs";
import DypnsapiClient from "@alicloud/dypnsapi20170525";

const PHONE_PATTERN = /^1\d{10}$/;
const OTP_EXPIRE_MS = 5 * 60 * 1000;
const ALLOWED_SMS_TYPES = new Set(["register", "reset"]);
const SMS_CODE_PARAM_NAME = normalizeText(process.env.ALIBABA_CLOUD_SMS_CODE_PARAM_NAME) || "code";
const SMS_MIN_PARAM_NAME = normalizeText(process.env.ALIBABA_CLOUD_SMS_MIN_PARAM_NAME) || "min";
const SMS_INCLUDE_MIN_PARAM = normalizeText(process.env.ALIBABA_CLOUD_SMS_INCLUDE_MIN_PARAM || "true").toLowerCase() !== "false";
const OTP_EXPIRE_MINUTES = Math.max(1, Math.round(OTP_EXPIRE_MS / 60000));

function normalizePhone(phone) {
  return String(phone || "").trim();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function createSmsCode() {
  return Math.floor(100000 + Math.random() * 899999).toString();
}

function saveOtpRecord(otpStore, phone, code) {
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_EXPIRE_MS });
}

function getOtpInvalidReason(record, code) {
  if (!record) return "missing";
  if (normalizeText(code) !== normalizeText(record.code)) return "mismatch";
  if (Date.now() > Number(record.expiresAt || 0)) return "expired";
  return "";
}

function mapOtpReasonToMessage(reason) {
  if (reason === "missing") return "验证码不存在，请先获取验证码";
  if (reason === "expired") return "验证码已过期，请重新获取";
  return "验证码错误";
}

function isDuplicateKeyError(error) {
  return Number(error?.errno) === 1062 || String(error?.code || "") === "ER_DUP_ENTRY";
}

function buildSmsTemplateParams(code) {
  const params = {
    [SMS_CODE_PARAM_NAME]: String(code || ""),
  };
  if (SMS_INCLUDE_MIN_PARAM) {
    params[SMS_MIN_PARAM_NAME] = String(OTP_EXPIRE_MINUTES);
  }
  return params;
}

export function registerAuthRoutes(app, { pool, otpStore, smsClient }) {
  app.post("/api/sms/send", async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const type = normalizeText(req.body?.type);

    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ ok: false, message: "手机号格式错误" });
    }
    if (!ALLOWED_SMS_TYPES.has(type)) {
      return res.status(400).json({ ok: false, message: "验证码类型错误" });
    }

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
        templateParam: JSON.stringify(buildSmsTemplateParams(code)),
      });

      const result = await smsClient.sendSmsVerifyCode(sendRequest);
      if (result.body.code !== "OK") {
        return res.status(400).json({ ok: false, message: result.body.message || "短信发送失败" });
      }

      saveOtpRecord(otpStore, phone, code);
      res.json({ ok: true, message: "验证码已发送" });
    } catch (error) {
      console.error("SMS send failed:", error?.message || error);
      res.status(500).json({ ok: false, message: "验证码发送失败，请稍后重试" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const username = normalizeText(req.body?.username);
    const phone = normalizePhone(req.body?.phone);
    const password = String(req.body?.password || "");
    const code = normalizeText(req.body?.code);

    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ ok: false, message: "手机号格式错误" });
    }
    if (!username) {
      return res.status(400).json({ ok: false, message: "用户名不能为空" });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "密码至少 6 位" });
    }
    if (!code) {
      return res.status(400).json({ ok: false, message: "请输入验证码" });
    }

    const otpReason = getOtpInvalidReason(otpStore.get(phone), code);
    if (otpReason) {
      return res.status(401).json({ ok: false, message: mapOtpReasonToMessage(otpReason) });
    }

    try {
      const [existsRows] = await pool.execute("SELECT id FROM users WHERE phone = ? LIMIT 1", [phone]);
      if (existsRows.length > 0) {
        otpStore.delete(phone);
        return res.status(409).json({ ok: false, message: "该手机号已注册，请直接登录" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await pool.execute("INSERT INTO users (username, phone, password_hash) VALUES (?, ?, ?)", [username, phone, passwordHash]);
      otpStore.delete(phone);
      res.json({ ok: true, message: "注册成功" });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        otpStore.delete(phone);
        return res.status(409).json({ ok: false, message: "该手机号已注册，请直接登录" });
      }
      console.error("Register failed:", error?.message || error);
      res.status(500).json({ ok: false, message: "注册失败，请稍后重试" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const password = String(req.body?.password || "");

    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ ok: false, message: "手机号格式错误" });
    }
    if (!password) {
      return res.status(400).json({ ok: false, message: "请输入密码" });
    }

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
      console.error("Login failed:", error?.message || error);
      res.status(500).json({ ok: false, message: "登录失败，请稍后重试" });
    }
  });

  app.get("/api/auth/user/:phone", async (req, res) => {
    const phone = normalizePhone(req.params.phone);
    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ ok: false, message: "手机号格式错误" });
    }
    try {
      const [rows] = await pool.execute(
        "SELECT username, phone, avatar_url FROM users WHERE phone = ? LIMIT 1",
        [phone],
      );
      if (!rows.length) return res.status(404).json({ ok: false, message: "用户不存在" });
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.json({
        ok: true,
        user: {
          username: rows[0].username,
          phone: rows[0].phone,
          avatar_url: rows[0].avatar_url,
        },
      });
    } catch (error) {
      console.error("Get user profile failed:", error?.message || error);
      res.status(500).json({ ok: false, message: "获取用户资料失败" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const password = String(req.body?.password || "");
    const code = normalizeText(req.body?.code);

    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ ok: false, message: "手机号格式错误" });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "密码至少 6 位" });
    }
    if (!code) {
      return res.status(400).json({ ok: false, message: "请输入验证码" });
    }

    const otpReason = getOtpInvalidReason(otpStore.get(phone), code);
    if (otpReason) {
      return res.status(401).json({ ok: false, message: mapOtpReasonToMessage(otpReason) });
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
      console.error("Reset password failed:", error?.message || error);
      res.status(500).json({ ok: false, message: "密码重置失败" });
    }
  });
}
