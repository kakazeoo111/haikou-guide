# 海口签到抽奖小程序（个人版）

这是一个最小可用版本，功能仅包含：

- 手机号 + 短信验证码登录
- 每日签到（每天 1 次）
- 转盘抽奖（签到后获得抽奖机会）

## 目录说明

- `app.js / app.json / app.wxss`：小程序入口
- `pages/login`：登录页
- `pages/home`：签到 + 抽奖页
- `utils/api.js`：接口请求封装

## 接口依赖

小程序使用你现有后端新增的接口：

- `POST /api/mp/auth/send-code`
- `POST /api/mp/auth/login-by-code`
- `POST /api/mp/auth/login-by-wx-phone`
- `GET /api/mp/sign/status`
- `POST /api/mp/sign/checkin`
- `GET /api/mp/lottery/prizes`
- `POST /api/mp/lottery/spin`
- `GET /api/mp/lottery/logs`

默认请求域名配置在 `utils/api.js`：

```js
const BASE_URL = "https://api.suzcore.top";
```

一键手机号登录依赖后端环境变量：

- `WECHAT_MINI_APPID`
- `WECHAT_MINI_APPSECRET`

## 启动步骤

1. 在微信公众平台创建个人小程序，获取 `AppID`。
2. 打开微信开发者工具，导入 `mini-program` 目录。
3. 把 `project.config.json` 里的 `appid` 改为你的真实 `AppID`。
4. 在微信公众平台后台配置服务器域名（必须 HTTPS）。
5. 启动你的网站后端服务并确保短信配置可用。

## 注意事项

- 这是 MVP 版本，抽奖概率写死在后端 `server/miniProgramRoutes.js` 的 `LOTTERY_PRIZES`。
- 短信验证码与网站共用阿里云短信服务配置。
