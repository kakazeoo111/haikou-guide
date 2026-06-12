# 海口旅行网站 UML 建模报告

项目名称：海口旅行网站 / Haikou Travel Guide  
项目路径：`C:\Users\苏家永\haikou-guide`  
技术架构：React + Vite 前端、Express 后端、MySQL 数据库、第三方短信与地图服务。

本文档用于配合 Enterprise Architect 建模和截图提交。建议在 EA 中建立一个根包“海口旅行网站UML模型”，下设“用例模型、静态结构模型、交互模型、行为模型”四个子包。

## 1. 系统概述

海口旅行网站面向游客和注册用户提供海口地点浏览、地图查看、搜索筛选、路线导航、收藏、点赞、评论、用户推荐、论坛互动、通知、反馈和称号展示等功能。管理员可管理公告、处理用户反馈、授权称号、删除违规推荐、评论和论坛内容。

主要代码依据：

- 前端入口：`src/App.jsx`
- 页面布局：`src/components/AppLayout.jsx`
- 首页与地图：`src/components/HomePanels.jsx`、`src/BaiduMap.jsx`
- 登录注册：`src/components/AuthPanel.jsx`、`server/authRoutes.js`
- 地点与评论：`src/data/places.js`、`server/placeCommentRoutes.js`
- 用户推荐：`src/components/RecommendModal.jsx`、`server/recommendationRoutes.js`
- 论坛：`src/components/ForumModal.jsx`、`server/forumRoutes.js`
- 通知：`src/components/NoticeListModal.jsx`、`server/notificationRoutes.js`
- 反馈管理：`src/components/FeedbackModal.jsx`、`src/components/AdminFeedbackModal.jsx`、`server/feedbackRoutes.js`
- 称号：`server/badgesRoutes.js`、`server/badgesService.js`

## 2. 用例模型

### 2.1 参与者

| 参与者 | 说明 |
| --- | --- |
| 游客 | 未登录用户，可浏览地点、查看地图、搜索筛选、查看详情、使用路线导航、注册和登录。 |
| 注册用户 | 登录后的用户，继承游客能力，并可收藏、点赞、评论、推荐地点、参与论坛、提交反馈、查看通知、切换称号。 |
| 管理员 | 系统管理者，继承注册用户能力，并可管理公告、处理反馈、授权称号、删除违规内容。 |
| 阿里云短信服务 | 外部服务，用于发送注册和重置密码验证码。 |
| 百度地图服务 | 外部服务，用于地图展示和路线导航。 |

### 2.2 核心用例

游客用例：

- 浏览地点列表
- 搜索/筛选地点
- 查看地图标记
- 查看地点详情
- 路线导航/规划
- 发送验证码
- 注册账号
- 登录系统
- 重置密码

注册用户用例：

- 管理个人资料
- 收藏地点
- 点赞地点
- 发表评论/回复
- 推荐新地点
- 参与论坛互动
- 提交反馈
- 查看通知
- 切换称号

管理员用例：

- 管理公告
- 处理用户反馈
- 管理称号授权
- 删除违规内容

用例关系：

- “注册账号”包含“发送验证码”。
- “重置密码”包含“发送验证码”。
- “发表评论/回复”“参与论坛互动”“处理用户反馈”会产生或使用“查看通知”。
- “查看地图标记”和“路线导航/规划”关联百度地图服务。
- “发送验证码”关联阿里云短信服务。

EA 截图建议：截图图名 `01_用例图_系统功能`。

## 3. 类图模型

类图分为三类对象：实体类、控制/服务类、外部服务类。

### 3.1 实体类

| 类 | 关键属性 | 说明 |
| --- | --- | --- |
| User | id, username, phone, passwordHash, avatarUrl, createdAt | 系统用户，对应 users 表。 |
| Place | id, type, name, desc, lat, lng, hours, phone, album | 静态地点数据，对应 `src/data/places.js`。 |
| Recommendation | id, userPhone, placeName, description, lat, lng, imageUrl, createdAt | 用户推荐地点，对应 recommendations 表。 |
| Favorite | id, userPhone, placeId, createdAt | 收藏记录，对应 favorites 表。 |
| PlaceLike | id, phone, placeId, createdAt | 地点点赞，对应 place_likes 表。 |
| Comment | id, placeId, userPhone, content, imageUrl, parentId, createdAt | 地点评论及回复，对应 comments 表。 |
| CommentLike | id, phone, commentId, createdAt | 评论点赞，对应 comment_likes 表。 |
| ForumPost | id, userPhone, content, imageUrl, createdAt | 论坛帖子，对应 forum_posts 表。 |
| ForumComment | id, postId, parentId, userPhone, content, imageUrl, createdAt | 论坛评论，对应 forum_comments 表。 |
| ForumPostCall | id, postId, userPhone, createdAt | 论坛打 call 记录，对应 forum_post_calls 表。 |
| ForumCommentLike | id, commentId, userPhone, createdAt | 论坛评论点赞，对应 forum_comment_likes 表。 |
| Notification | id, receiverPhone, senderPhone, type, placeId, content, isRead, createdAt | 通知，对应 notifications 表。 |
| Feedback | id, phone, content, imageUrl, isRead, isResolved, adminReply, parentFeedbackId, createdAt | 用户反馈和回信，对应 feedback 表。 |
| BadgeGrant | id, userPhone, badgeName, grantedBy, isActive, note, grantedAt | 管理员手动称号授权。 |
| BadgePreference | id, userPhone, selectedBadgeName, updatedAt | 用户当前选择称号。 |
| Announcement | id, content | 公告内容。 |

### 3.2 服务类

| 类 | 主要职责 |
| --- | --- |
| AuthService | 发送验证码、注册、登录、重置密码、生成认证 token。 |
| PlaceService | 地点列表、收藏、地点点赞和统计。 |
| CommentService | 地点评论列表、添加评论、评论点赞、删除评论树。 |
| RecommendationService | 用户推荐列表、新增推荐、推荐点赞、删除推荐。 |
| ForumService | 论坛帖子、评论、打 call、点赞和删除。 |
| FeedbackService | 提交反馈、管理员查看/标记/回复/删除、用户补充回信。 |
| NotificationService | 创建通知、获取通知、标记已读、清空通知。 |
| BadgeService | 计算称号、授权称号、切换称号。 |
| UploadService | 上传图片校验、保存和图片 URL 组装。 |

### 3.3 主要关系

- User 1..* Recommendation：用户发布推荐地点。
- User 1..* Favorite：用户收藏地点。
- Place 1..* Comment：地点拥有评论。
- Comment 0..* Comment：评论可以有回复。
- ForumPost 1..* ForumComment：帖子包含评论。
- ForumComment 0..* ForumComment：论坛评论可以有回复。
- User 1..* Feedback：用户提交反馈。
- Feedback 0..* Feedback：反馈可以追加回信。
- User 1..* Notification：用户接收和发送通知。
- BadgeGrant、BadgePreference 与 User 关联。
- CommentService、ForumService、FeedbackService 依赖 NotificationService 创建通知。
- CommentService、ForumService、RecommendationService、FeedbackService 依赖 UploadService 处理图片。

EA 截图建议：截图图名 `02_类图_核心领域模型`。

## 4. 顺序图

### 4.1 用户登录顺序图

图名：`03_顺序图_用户登录`

对象：

- 注册用户
- AuthPanel
- authFetch/API Client
- AuthRoutes
- MySQL users
- bcrypt
- AuthToken
- LocalStorage

消息流程：

1. 用户输入手机号和密码并提交。
2. AuthPanel 调用 API Client，发送 `POST /api/auth/login`。
3. AuthRoutes 接收登录请求。
4. AuthRoutes 查询 users 表。
5. MySQL 返回用户记录。
6. AuthRoutes 调用 bcrypt 校验密码。
7. bcrypt 返回密码校验结果。
8. AuthRoutes 调用 AuthToken 生成 token。
9. AuthRoutes 返回 token 和用户信息。
10. AuthPanel 将用户和 token 保存到 LocalStorage。
11. 前端进入首页并恢复登录状态。

异常分支：

- 手机号格式错误：返回 400。
- 用户不存在或密码错误：返回 401。
- 服务端异常：返回 500。

### 4.2 发布评论并通知顺序图

图名：`04_顺序图_发布评论并通知`

对象：

- 注册用户
- CommentsOverlay
- InteractionHandlers
- Comment API
- UploadService
- comments 表
- NotificationService
- notifications 表

消息流程：

1. 用户打开地点评论面板。
2. 前端加载当前地点评论。
3. 用户输入评论、选择图片或回复对象。
4. InteractionHandlers 发送 `POST /api/comments/add`。
5. Comment API 校验上传图片。
6. Comment API 写入 comments 表。
7. 如果是回复，调用 NotificationService 创建通知。
8. NotificationService 写入 notifications 表。
9. API 返回成功。
10. 前端清空输入并刷新评论。

异常分支：

- 未登录：认证中间件拒绝请求。
- 上传图片不合法：返回 400。
- 数据库写入失败：返回 500。

EA 截图建议：分别截图 `03_顺序图_用户登录` 和 `04_顺序图_发布评论并通知`。

## 5. 状态图

图名：`05_状态图_反馈处理生命周期`

建模对象：Feedback。

状态：

- 草稿：用户正在输入反馈。
- 已提交：用户提交后进入服务端处理。
- 未读：反馈写入数据库，等待管理员查看。
- 已读：管理员查看或手动标记已读。
- 已回复：管理员发送回信。
- 已解决：管理员标记问题已解决。
- 用户补充回信：用户继续补充反馈内容。
- 已删除：管理员删除已读或已解决反馈。

状态迁移：

- 草稿 -> 已提交：填写内容并提交。
- 已提交 -> 未读：写入 feedback 表。
- 未读 -> 已读：管理员查看或标记。
- 已读 -> 已回复：管理员回信。
- 已回复 -> 已解决：管理员勾选解决。
- 已解决 -> 用户补充回信：用户继续回信。
- 用户补充回信 -> 未读：反馈重新进入待处理。
- 已读/已解决 -> 已删除：管理员删除反馈。

EA 截图建议：截图图名 `05_状态图_反馈处理生命周期`。

## 6. 活动图

图名：`06_活动图_地点浏览与互动`

活动流程：

1. 开始。
2. 打开海口旅行网站。
3. 加载用户、定位、公告、推荐数据。
4. 浏览、搜索或筛选地点。
5. 查看地点详情和地图标记。
6. 判断是否已登录。
7. 未登录用户可继续路线导航，也可登录/注册。
8. 已登录用户可收藏、点赞、评论、回复。
9. 用户可提交推荐地点。
10. 用户可进入论坛发帖、评论或打 call。
11. 系统可产生通知，用户可提交反馈。
12. 用户可选择收藏地点生成路线规划。
13. 结束。

EA 截图建议：截图图名 `06_活动图_地点浏览与互动`。

## 7. 截图提交清单

建议最终提交 6 张 EA 截图：

1. `01_用例图_系统功能`
2. `02_类图_核心领域模型`
3. `03_顺序图_用户登录`
4. `04_顺序图_发布评论并通知`
5. `05_状态图_反馈处理生命周期`
6. `06_活动图_地点浏览与互动`

截图时建议：

- 每张图单独打开截图，不要截项目浏览器。
- 图上元素文字保持清晰可读。
- 如果类图过密，可在 EA 中拉大画布或分辨率后截图。
- 截图文件名直接使用图名，便于老师检查。
