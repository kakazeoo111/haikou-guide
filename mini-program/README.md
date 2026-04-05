# Haikou Sign Lottery Mini Program

This mini program is now **one-click login only**:

- WeChat one-click login (`wx.login`)
- Daily check-in (1 time per day)
- Lucky wheel spin (check-in gives draw chances)

## Pages

- `pages/login`: one-click login page
- `pages/home`: check-in, spin, draw logs

## API Endpoints

- `POST /api/mp/auth/login-by-wechat`
- `GET /api/mp/sign/status`
- `POST /api/mp/sign/checkin`
- `GET /api/mp/lottery/prizes`
- `POST /api/mp/lottery/spin`
- `GET /api/mp/lottery/logs`

## Required Env Vars (Backend)

- `WECHAT_MINI_APPID`
- `WECHAT_MINI_APPSECRET`

## Domain

Request base URL is in `mini-program/utils/api.js`:

```js
const BASE_URL = "https://api.suzcore.top";
```

## Start

1. Create a personal mini program and get your `AppID`.
2. Import `mini-program` directory in WeChat DevTools.
3. Replace `appid` in `mini-program/project.config.json`.
4. Configure legal request domain in WeChat platform (must be HTTPS).
5. Deploy backend code and restart your Node process.
