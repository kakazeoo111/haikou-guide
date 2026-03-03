import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import twilio from "twilio";

dotenv.config();

const app = express();
const port = Number(process.env.SMS_SERVER_PORT || 3001);

app.use(cors());
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const hasTwilioConfig = Boolean(accountSid && authToken && verifyServiceSid);
const twilioClient = hasTwilioConfig ? twilio(accountSid, authToken) : null;

// 简单内存存储：一个邮箱只能绑定一个用户名
const accountStore = new Map(); // email -> username

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, smsProviderReady: hasTwilioConfig, emailProviderReady: hasTwilioConfig });
});

app.post("/api/sms/send", async (req, res) => {
  const { phone } = req.body || {};

  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ ok: false, message: "手机号格式不正确" });
  }

  if (!twilioClient) {
    return res.status(500).json({ ok: false, message: "短信服务未配置，请联系管理员" });
  }

  try {
    await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: `+86${phone}`, channel: "sms" });

    return res.json({ ok: true, message: "验证码已发送" });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "发送验证码失败",
      detail: error?.message || "unknown error",
    });
  }
});

app.post("/api/sms/verify", async (req, res) => {
  const { phone, code } = req.body || {};

  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ ok: false, message: "手机号格式不正确" });
  }

  if (!code || !/^\d{4,8}$/.test(code)) {
    return res.status(400).json({ ok: false, message: "验证码格式不正确" });
  }

  if (!twilioClient) {
    return res.status(500).json({ ok: false, message: "短信服务未配置，请联系管理员" });
  }

  try {
    const check = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: `+86${phone}`, code });

    if (check.status === "approved") {
      return res.json({ ok: true, message: "验证通过" });
    }

    return res.status(401).json({ ok: false, message: "验证码错误或已过期" });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "验证码校验失败",
      detail: error?.message || "unknown error",
    });
  }
});


app.post("/api/email/send", async (req, res) => {
  const { email, username } = req.body || {};

  if (!username || !email) {
    return res.status(400).json({ ok: false, message: "用户名和邮箱不能为空" });
  }

  if (!isEmailValid(email)) {
    return res.status(400).json({ ok: false, message: "邮箱格式不正确" });
  }

  const boundUsername = accountStore.get(email);
  if (boundUsername && boundUsername !== username) {
    return res.status(409).json({ ok: false, message: "该邮箱已绑定其他账号，一个邮箱只能注册一个号" });
  }

  if (!twilioClient) {
    return res.status(500).json({ ok: false, message: "邮箱验证码服务未配置，请联系管理员" });
  }

  try {
    await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: email, channel: "email" });

    return res.json({ ok: true, message: "验证码已发送到邮箱" });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "发送邮箱验证码失败",
      detail: error?.message || "unknown error",
    });
  }
});

app.post("/api/email/verify", async (req, res) => {
  const { email, username, code } = req.body || {};

  if (!username || !email || !code) {
    return res.status(400).json({ ok: false, message: "用户名、邮箱、验证码不能为空" });
  }

  if (!isEmailValid(email)) {
    return res.status(400).json({ ok: false, message: "邮箱格式不正确" });
  }

  const boundUsername = accountStore.get(email);
  if (boundUsername && boundUsername !== username) {
    return res.status(409).json({ ok: false, message: "该邮箱已绑定其他账号，一个邮箱只能注册一个号" });
  }

  if (!twilioClient) {
    return res.status(500).json({ ok: false, message: "邮箱验证码服务未配置，请联系管理员" });
  }

  try {
    const check = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: email, code });

    if (check.status !== "approved") {
      return res.status(401).json({ ok: false, message: "验证码错误或已过期" });
    }

    accountStore.set(email, username);
    return res.json({ ok: true, message: "登录成功", user: { username, email } });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "验证码校验失败",
      detail: error?.message || "unknown error",
    });
  }
});

app.listen(port, () => {
  console.log(`SMS/Email server running on http://localhost:${port}`);
  if (!hasTwilioConfig) {
    console.warn("Twilio env is not configured. SMS and email verification endpoints will return config errors.");
  }
});
