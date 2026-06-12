/*
 * Enterprise Architect JScript
 * 用途：在当前 EA 项目中自动创建“海口旅行网站”的 UML 模型与截图用图。
 *
 * 使用方式：
 * 1. 在 Enterprise Architect 中新建或打开一个 .qea/.eapx 项目。
 * 2. 打开 Scripting 窗口，新建 JScript 脚本。
 * 3. 将本文件内容粘贴进去并运行。
 * 4. 在项目浏览器中打开“海口旅行网站UML模型”包下的 6 张图截图。
 */

function log(message) {
  if (typeof Session !== "undefined") {
    Session.Output(message);
  }
}

function collectionFindByName(collection, name) {
  for (var i = 0; i < collection.Count; i += 1) {
    var item = collection.GetAt(i);
    if (String(item.Name) === String(name)) return item;
  }
  return null;
}

function getRootPackage() {
  if (Repository.Models.Count > 0) return Repository.Models.GetAt(0);
  var model = Repository.Models.AddNew("Model", "Package");
  model.Update();
  Repository.Models.Refresh();
  return model;
}

function createUniquePackage(parentPackage, baseName) {
  var name = baseName;
  var index = 2;
  while (collectionFindByName(parentPackage.Packages, name)) {
    name = baseName + "_" + index;
    index += 1;
  }
  var pkg = parentPackage.Packages.AddNew(name, "");
  pkg.Update();
  parentPackage.Packages.Refresh();
  return pkg;
}

function addPackage(parentPackage, name) {
  var pkg = parentPackage.Packages.AddNew(name, "");
  pkg.Update();
  parentPackage.Packages.Refresh();
  return pkg;
}

function addElement(pkg, key, name, type, stereotype, notes, registry) {
  var element = pkg.Elements.AddNew(name, type);
  if (stereotype) element.Stereotype = stereotype;
  if (notes) element.Notes = notes;
  element.Update();
  pkg.Elements.Refresh();
  if (registry) registry[key] = element;
  return element;
}

function addAttribute(element, name, type) {
  var attr = element.Attributes.AddNew(name, type);
  attr.Update();
  element.Attributes.Refresh();
}

function addOperation(element, name, returnType) {
  var method = element.Methods.AddNew(name, returnType || "");
  method.Update();
  element.Methods.Refresh();
}

function addDiagram(pkg, name, type, notes) {
  var diagram = pkg.Diagrams.AddNew(name, type);
  if (notes) diagram.Notes = notes;
  diagram.Update();
  pkg.Diagrams.Refresh();
  return diagram;
}

function addDiagramObject(diagram, element, left, top, width, height) {
  var style = "l=" + left + ";r=" + (left + width) + ";t=" + top + ";b=" + (top - height) + ";";
  var obj = diagram.DiagramObjects.AddNew(style, "");
  obj.ElementID = element.ElementID;
  obj.Update();
  diagram.DiagramObjects.Refresh();
  return obj;
}

function addConnector(source, target, type, name, stereotype) {
  var connector = source.Connectors.AddNew(name || "", type);
  connector.SupplierID = target.ElementID;
  if (stereotype) connector.Stereotype = stereotype;
  connector.Update();
  source.Connectors.Refresh();
  return connector;
}

function addDiagramLink(diagram, connector) {
  try {
    var link = diagram.DiagramLinks.AddNew("", "");
    link.ConnectorID = connector.ConnectorID;
    link.Update();
    diagram.DiagramLinks.Refresh();
  } catch (e) {
    // 部分 EA 版本会自动显示连接线，这里忽略重复链接失败。
  }
}

function addLinkedConnector(diagram, source, target, type, name, stereotype) {
  var connector = addConnector(source, target, type, name, stereotype);
  addDiagramLink(diagram, connector);
  return connector;
}

function saveDiagram(diagram) {
  diagram.Update();
  Repository.SaveDiagram(diagram.DiagramID);
  Repository.ReloadDiagram(diagram.DiagramID);
}

function createUseCaseDiagram(pkg) {
  var r = {};
  var diagram = addDiagram(pkg, "01_用例图_系统功能", "Use Case", "海口旅行网站总用例图，用于截图提交。");

  addElement(pkg, "guest", "游客", "Actor", "", "未登录访问者，可浏览公开内容。", r);
  addElement(pkg, "user", "注册用户", "Actor", "", "登录后的普通用户。", r);
  addElement(pkg, "admin", "管理员", "Actor", "", "站长/管理员，拥有管理权限。", r);
  addElement(pkg, "sms", "阿里云短信服务", "Actor", "external", "发送注册和重置密码验证码。", r);
  addElement(pkg, "map", "百度地图服务", "Actor", "external", "提供地图展示和路线导航。", r);

  addElement(pkg, "browse", "浏览地点列表", "UseCase", "", "", r);
  addElement(pkg, "search", "搜索/筛选地点", "UseCase", "", "", r);
  addElement(pkg, "mapview", "查看地图标记", "UseCase", "", "", r);
  addElement(pkg, "detail", "查看地点详情", "UseCase", "", "", r);
  addElement(pkg, "route", "路线导航/规划", "UseCase", "", "", r);
  addElement(pkg, "sendCode", "发送验证码", "UseCase", "", "", r);
  addElement(pkg, "register", "注册账号", "UseCase", "", "", r);
  addElement(pkg, "login", "登录系统", "UseCase", "", "", r);
  addElement(pkg, "reset", "重置密码", "UseCase", "", "", r);
  addElement(pkg, "profile", "管理个人资料", "UseCase", "", "", r);
  addElement(pkg, "favorite", "收藏地点", "UseCase", "", "", r);
  addElement(pkg, "likePlace", "点赞地点", "UseCase", "", "", r);
  addElement(pkg, "comment", "发表评论/回复", "UseCase", "", "", r);
  addElement(pkg, "recommend", "推荐新地点", "UseCase", "", "", r);
  addElement(pkg, "forum", "参与论坛互动", "UseCase", "", "", r);
  addElement(pkg, "feedback", "提交反馈", "UseCase", "", "", r);
  addElement(pkg, "notice", "查看通知", "UseCase", "", "", r);
  addElement(pkg, "badge", "切换称号", "UseCase", "", "", r);
  addElement(pkg, "announcement", "管理公告", "UseCase", "", "", r);
  addElement(pkg, "feedbackAdmin", "处理用户反馈", "UseCase", "", "", r);
  addElement(pkg, "badgeAdmin", "管理称号授权", "UseCase", "", "", r);
  addElement(pkg, "contentAdmin", "删除违规内容", "UseCase", "", "", r);

  addDiagramObject(diagram, r.guest, 20, 420, 90, 70);
  addDiagramObject(diagram, r.user, 20, 230, 90, 70);
  addDiagramObject(diagram, r.admin, 20, 40, 90, 70);
  addDiagramObject(diagram, r.sms, 690, 300, 110, 70);
  addDiagramObject(diagram, r.map, 690, 145, 110, 70);

  var positions = [
    ["browse", 180, 480], ["search", 370, 480], ["mapview", 560, 480],
    ["detail", 180, 390], ["route", 370, 390], ["sendCode", 560, 390],
    ["register", 180, 300], ["login", 370, 300], ["reset", 560, 300],
    ["profile", 180, 210], ["favorite", 370, 210], ["likePlace", 560, 210],
    ["comment", 180, 120], ["recommend", 370, 120], ["forum", 560, 120],
    ["feedback", 180, 30], ["notice", 370, 30], ["badge", 560, 30],
    ["announcement", 180, -60], ["feedbackAdmin", 370, -60], ["badgeAdmin", 560, -60],
    ["contentAdmin", 370, -150]
  ];
  for (var i = 0; i < positions.length; i += 1) {
    addDiagramObject(diagram, r[positions[i][0]], positions[i][1], positions[i][2], 130, 55);
  }

  addLinkedConnector(diagram, r.user, r.guest, "Generalization", "", "");
  addLinkedConnector(diagram, r.admin, r.user, "Generalization", "", "");

  var guestCases = ["browse", "search", "mapview", "detail", "route", "register", "login", "reset"];
  for (i = 0; i < guestCases.length; i += 1) addLinkedConnector(diagram, r.guest, r[guestCases[i]], "Association", "", "");
  var userCases = ["profile", "favorite", "likePlace", "comment", "recommend", "forum", "feedback", "notice", "badge"];
  for (i = 0; i < userCases.length; i += 1) addLinkedConnector(diagram, r.user, r[userCases[i]], "Association", "", "");
  var adminCases = ["announcement", "feedbackAdmin", "badgeAdmin", "contentAdmin"];
  for (i = 0; i < adminCases.length; i += 1) addLinkedConnector(diagram, r.admin, r[adminCases[i]], "Association", "", "");

  addLinkedConnector(diagram, r.register, r.sendCode, "Dependency", "", "include");
  addLinkedConnector(diagram, r.reset, r.sendCode, "Dependency", "", "include");
  addLinkedConnector(diagram, r.sms, r.sendCode, "Association", "", "");
  addLinkedConnector(diagram, r.map, r.mapview, "Association", "", "");
  addLinkedConnector(diagram, r.map, r.route, "Association", "", "");
  addLinkedConnector(diagram, r.comment, r.notice, "Dependency", "", "include");
  addLinkedConnector(diagram, r.forum, r.notice, "Dependency", "", "include");
  addLinkedConnector(diagram, r.feedbackAdmin, r.notice, "Dependency", "", "include");

  saveDiagram(diagram);
}

function createClassDiagram(pkg) {
  var r = {};
  var diagram = addDiagram(pkg, "02_类图_核心领域模型", "Logical", "核心领域类图，覆盖前端业务对象、服务和数据库实体。");

  var classSpecs = [
    ["User", "User", "entity", ["id:int", "username:String", "phone:String", "passwordHash:String", "avatarUrl:String", "createdAt:DateTime"], ["register()", "login()", "uploadAvatar()"]],
    ["Place", "Place", "entity", ["id:String", "type:String", "name:String", "desc:String", "lat:Decimal", "lng:Decimal", "hours:String", "phone:String", "album:Image[]"], ["filter()", "navigate()"]],
    ["Recommendation", "Recommendation", "entity", ["id:int", "userPhone:String", "placeName:String", "description:String", "lat:Decimal", "lng:Decimal", "imageUrl:JSON", "createdAt:DateTime"], ["publish()", "delete()"]],
    ["Favorite", "Favorite", "entity", ["id:int", "userPhone:String", "placeId:String", "createdAt:DateTime"], ["toggle()"]],
    ["PlaceLike", "PlaceLike", "entity", ["id:int", "phone:String", "placeId:String", "createdAt:DateTime"], ["toggle()"]],
    ["Comment", "Comment", "entity", ["id:int", "placeId:String", "userPhone:String", "content:Text", "imageUrl:JSON", "parentId:int", "createdAt:DateTime"], ["reply()", "deleteTree()"]],
    ["CommentLike", "CommentLike", "entity", ["id:int", "phone:String", "commentId:int", "createdAt:DateTime"], ["toggle()"]],
    ["ForumPost", "ForumPost", "entity", ["id:int", "userPhone:String", "content:Text", "imageUrl:JSON", "createdAt:DateTime"], ["publish()", "delete()"]],
    ["ForumComment", "ForumComment", "entity", ["id:int", "postId:int", "parentId:int", "userPhone:String", "content:Text", "imageUrl:JSON", "createdAt:DateTime"], ["reply()", "deleteTree()"]],
    ["ForumPostCall", "ForumPostCall", "entity", ["id:int", "postId:int", "userPhone:String", "createdAt:DateTime"], ["toggle()"]],
    ["ForumCommentLike", "ForumCommentLike", "entity", ["id:int", "commentId:int", "userPhone:String", "createdAt:DateTime"], ["toggle()"]],
    ["Notification", "Notification", "entity", ["id:int", "receiverPhone:String", "senderPhone:String", "type:String", "placeId:String", "content:Text", "isRead:Boolean", "createdAt:DateTime"], ["markRead()", "clear()"]],
    ["Feedback", "Feedback", "entity", ["id:int", "phone:String", "content:Text", "imageUrl:JSON", "isRead:Boolean", "isResolved:Boolean", "adminReply:Text", "parentFeedbackId:int", "createdAt:DateTime"], ["submit()", "reply()", "followup()", "resolve()"]],
    ["BadgeGrant", "BadgeGrant", "entity", ["id:long", "userPhone:String", "badgeName:String", "grantedBy:String", "isActive:Boolean", "note:String", "grantedAt:DateTime"], ["enable()", "disable()"]],
    ["BadgePreference", "BadgePreference", "entity", ["id:long", "userPhone:String", "selectedBadgeName:String", "updatedAt:DateTime"], ["select()"]],
    ["Announcement", "Announcement", "entity", ["id:int", "content:Text"], ["update()"]],
    ["AuthService", "AuthService", "control", [], ["sendSmsCode()", "register()", "login()", "resetPassword()", "createAuthToken()"]],
    ["PlaceService", "PlaceService", "control", [], ["listPlaces()", "getStats()", "toggleFavorite()", "togglePlaceLike()"]],
    ["CommentService", "CommentService", "control", [], ["listComments()", "addComment()", "toggleCommentLike()", "deleteCommentTree()"]],
    ["RecommendationService", "RecommendationService", "control", [], ["listRecommendations()", "addRecommendation()", "likeRecommendation()", "deleteRecommendation()"]],
    ["ForumService", "ForumService", "control", [], ["listPosts()", "addPost()", "callPost()", "addComment()", "deleteContent()"]],
    ["FeedbackService", "FeedbackService", "control", [], ["submitFeedback()", "listAll()", "updateStatus()", "reply()", "followup()"]],
    ["NotificationService", "NotificationService", "control", [], ["addNotice()", "listNotices()", "markRead()", "clear()"]],
    ["BadgeService", "BadgeService", "control", [], ["buildUserBadgeData()", "updateManualGrant()", "saveSelectedBadge()"]],
    ["UploadService", "UploadService", "control", [], ["validateImages()", "storeUpload()", "buildImagePayload()"]]
  ];

  for (var i = 0; i < classSpecs.length; i += 1) {
    var spec = classSpecs[i];
    var element = addElement(pkg, spec[0], spec[1], "Class", spec[2], "", r);
    for (var a = 0; a < spec[3].length; a += 1) {
      var parts = spec[3][a].split(":");
      addAttribute(element, parts[0], parts.length > 1 ? parts[1] : "");
    }
    for (var m = 0; m < spec[4].length; m += 1) addOperation(element, spec[4][m], "");
  }

  var coords = [
    ["User", 20, 520], ["Place", 250, 520], ["Recommendation", 480, 520], ["Favorite", 710, 520],
    ["PlaceLike", 20, 350], ["Comment", 250, 350], ["CommentLike", 480, 350], ["Notification", 710, 350],
    ["ForumPost", 20, 180], ["ForumComment", 250, 180], ["ForumPostCall", 480, 180], ["ForumCommentLike", 710, 180],
    ["Feedback", 20, 10], ["BadgeGrant", 250, 10], ["BadgePreference", 480, 10], ["Announcement", 710, 10],
    ["AuthService", 20, -180], ["PlaceService", 230, -180], ["CommentService", 440, -180], ["RecommendationService", 650, -180],
    ["ForumService", 20, -330], ["FeedbackService", 230, -330], ["NotificationService", 440, -330], ["BadgeService", 650, -330],
    ["UploadService", 860, -330]
  ];
  for (i = 0; i < coords.length; i += 1) addDiagramObject(diagram, r[coords[i][0]], coords[i][1], coords[i][2], 190, 130);

  var assoc = [
    ["User", "Recommendation", "Association", "发布", ""],
    ["User", "Favorite", "Association", "拥有", ""],
    ["User", "PlaceLike", "Association", "点赞", ""],
    ["User", "Comment", "Association", "发表", ""],
    ["User", "ForumPost", "Association", "发帖", ""],
    ["User", "ForumComment", "Association", "论坛评论", ""],
    ["User", "Feedback", "Association", "提交", ""],
    ["Place", "Favorite", "Association", "被收藏", ""],
    ["Place", "PlaceLike", "Association", "被点赞", ""],
    ["Place", "Comment", "Association", "拥有评论", ""],
    ["Recommendation", "Place", "Dependency", "形成用户地点", ""],
    ["Comment", "Comment", "Association", "parent/reply", ""],
    ["Comment", "CommentLike", "Association", "被点赞", ""],
    ["ForumPost", "ForumComment", "Association", "包含", ""],
    ["ForumPost", "ForumPostCall", "Association", "被打call", ""],
    ["ForumComment", "ForumComment", "Association", "parent/reply", ""],
    ["ForumComment", "ForumCommentLike", "Association", "被点赞", ""],
    ["Notification", "User", "Association", "sender/receiver", ""],
    ["Feedback", "Feedback", "Association", "followup", ""],
    ["BadgeGrant", "User", "Association", "授权给", ""],
    ["BadgePreference", "User", "Association", "用户选择", ""],
    ["AuthService", "User", "Dependency", "认证读写", ""],
    ["PlaceService", "Place", "Dependency", "查询", ""],
    ["PlaceService", "Favorite", "Dependency", "维护", ""],
    ["PlaceService", "PlaceLike", "Dependency", "维护", ""],
    ["CommentService", "Comment", "Dependency", "维护", ""],
    ["CommentService", "NotificationService", "Dependency", "回复通知", ""],
    ["RecommendationService", "Recommendation", "Dependency", "维护", ""],
    ["ForumService", "ForumPost", "Dependency", "维护", ""],
    ["ForumService", "ForumComment", "Dependency", "维护", ""],
    ["ForumService", "NotificationService", "Dependency", "互动通知", ""],
    ["FeedbackService", "Feedback", "Dependency", "维护", ""],
    ["FeedbackService", "NotificationService", "Dependency", "回信通知", ""],
    ["BadgeService", "BadgeGrant", "Dependency", "授权", ""],
    ["BadgeService", "BadgePreference", "Dependency", "选择", ""],
    ["FeedbackService", "UploadService", "Dependency", "图片上传", ""],
    ["CommentService", "UploadService", "Dependency", "图片上传", ""],
    ["ForumService", "UploadService", "Dependency", "图片上传", ""],
    ["RecommendationService", "UploadService", "Dependency", "图片上传", ""]
  ];
  for (i = 0; i < assoc.length; i += 1) {
    addLinkedConnector(diagram, r[assoc[i][0]], r[assoc[i][1]], assoc[i][2], assoc[i][3], assoc[i][4]);
  }

  saveDiagram(diagram);
}

function addMessage(diagram, source, target, seq, name) {
  var connector = addConnector(source, target, "Sequence", seq + ": " + name, "");
  try {
    connector.SequenceNo = String(seq);
    connector.Update();
  } catch (e) {
    // 老版本 EA 对 SequenceNo 写入支持不一致，消息名已经包含序号。
  }
  addDiagramLink(diagram, connector);
}

function createLoginSequenceDiagram(pkg) {
  var r = {};
  var diagram = addDiagram(pkg, "03_顺序图_用户登录", "Sequence", "用户通过手机号和密码登录系统。");
  addElement(pkg, "actor", "注册用户", "Actor", "", "", r);
  addElement(pkg, "authPanel", "AuthPanel", "Object", "boundary", "", r);
  addElement(pkg, "apiClient", "authFetch/API Client", "Object", "control", "", r);
  addElement(pkg, "authRoute", "AuthRoutes", "Object", "control", "", r);
  addElement(pkg, "db", "MySQL users", "Object", "database", "", r);
  addElement(pkg, "bcrypt", "bcrypt", "Object", "external", "", r);
  addElement(pkg, "jwt", "AuthToken", "Object", "control", "", r);
  addElement(pkg, "storage", "LocalStorage", "Object", "boundary", "", r);

  var lifelines = ["actor", "authPanel", "apiClient", "authRoute", "db", "bcrypt", "jwt", "storage"];
  for (var i = 0; i < lifelines.length; i += 1) {
    addDiagramObject(diagram, r[lifelines[i]], 20 + i * 145, 420, 115, 70);
  }

  addMessage(diagram, r.actor, r.authPanel, 1, "输入手机号和密码并提交");
  addMessage(diagram, r.authPanel, r.apiClient, 2, "POST /api/auth/login");
  addMessage(diagram, r.apiClient, r.authRoute, 3, "转发登录请求");
  addMessage(diagram, r.authRoute, r.db, 4, "SELECT * FROM users WHERE phone = ?");
  addMessage(diagram, r.db, r.authRoute, 5, "返回用户记录");
  addMessage(diagram, r.authRoute, r.bcrypt, 6, "compare(password, password_hash)");
  addMessage(diagram, r.bcrypt, r.authRoute, 7, "返回密码校验结果");
  addMessage(diagram, r.authRoute, r.jwt, 8, "createAuthToken(user)");
  addMessage(diagram, r.jwt, r.authRoute, 9, "返回 token");
  addMessage(diagram, r.authRoute, r.apiClient, 10, "返回 token + user");
  addMessage(diagram, r.apiClient, r.authPanel, 11, "解析登录结果");
  addMessage(diagram, r.authPanel, r.storage, 12, "saveAuthSession(user, token)");
  addMessage(diagram, r.authPanel, r.actor, 13, "进入首页/恢复用户状态");
  saveDiagram(diagram);
}

function createCommentSequenceDiagram(pkg) {
  var r = {};
  var diagram = addDiagram(pkg, "04_顺序图_发布评论并通知", "Sequence", "用户在地点详情中发表评论或回复，并触发通知。");
  addElement(pkg, "actor", "注册用户", "Actor", "", "", r);
  addElement(pkg, "overlay", "CommentsOverlay", "Object", "boundary", "", r);
  addElement(pkg, "handler", "InteractionHandlers", "Object", "control", "", r);
  addElement(pkg, "api", "Comment API", "Object", "control", "", r);
  addElement(pkg, "upload", "UploadService", "Object", "control", "", r);
  addElement(pkg, "comments", "comments表", "Object", "database", "", r);
  addElement(pkg, "notice", "NotificationService", "Object", "control", "", r);
  addElement(pkg, "notifications", "notifications表", "Object", "database", "", r);

  var lifelines = ["actor", "overlay", "handler", "api", "upload", "comments", "notice", "notifications"];
  for (var i = 0; i < lifelines.length; i += 1) {
    addDiagramObject(diagram, r[lifelines[i]], 20 + i * 145, 420, 115, 70);
  }

  addMessage(diagram, r.actor, r.overlay, 1, "打开地点评论面板");
  addMessage(diagram, r.overlay, r.handler, 2, "fetchComments(placeId)");
  addMessage(diagram, r.handler, r.api, 3, "GET /api/comments/:placeId");
  addMessage(diagram, r.api, r.comments, 4, "查询评论及点赞统计");
  addMessage(diagram, r.comments, r.overlay, 5, "返回评论列表");
  addMessage(diagram, r.actor, r.overlay, 6, "输入评论/选择图片/选择回复对象");
  addMessage(diagram, r.overlay, r.handler, 7, "handleAddComment()");
  addMessage(diagram, r.handler, r.api, 8, "POST /api/comments/add");
  addMessage(diagram, r.api, r.upload, 9, "validateUploadedImages()");
  addMessage(diagram, r.api, r.comments, 10, "INSERT INTO comments");
  addMessage(diagram, r.api, r.notice, 11, "若为回复则 addNotice()");
  addMessage(diagram, r.notice, r.notifications, 12, "INSERT INTO notifications");
  addMessage(diagram, r.api, r.handler, 13, "返回 ok");
  addMessage(diagram, r.handler, r.overlay, 14, "清空输入并刷新评论");
  saveDiagram(diagram);
}

function createFeedbackStateDiagram(pkg) {
  var r = {};
  var diagram = addDiagram(pkg, "05_状态图_反馈处理生命周期", "Statechart", "用户反馈从提交到处理、解决、补充和删除的状态变化。");
  var states = [
    ["Draft", "草稿", 30, 390],
    ["Submitted", "已提交", 210, 390],
    ["Unread", "未读", 390, 390],
    ["Read", "已读", 570, 390],
    ["Replied", "已回复", 210, 250],
    ["Resolved", "已解决", 390, 250],
    ["Followup", "用户补充回信", 570, 250],
    ["Deleted", "已删除", 390, 110]
  ];
  for (var i = 0; i < states.length; i += 1) {
    addElement(pkg, states[i][0], states[i][1], "State", "", "", r);
    addDiagramObject(diagram, r[states[i][0]], states[i][2], states[i][3], 130, 55);
  }
  addLinkedConnector(diagram, r.Draft, r.Submitted, "StateFlow", "填写内容并提交", "");
  addLinkedConnector(diagram, r.Submitted, r.Unread, "StateFlow", "写入 feedback 表", "");
  addLinkedConnector(diagram, r.Unread, r.Read, "StateFlow", "管理员查看/标记已读", "");
  addLinkedConnector(diagram, r.Read, r.Replied, "StateFlow", "管理员回信", "");
  addLinkedConnector(diagram, r.Replied, r.Resolved, "StateFlow", "标记解决", "");
  addLinkedConnector(diagram, r.Resolved, r.Followup, "StateFlow", "用户继续回信", "");
  addLinkedConnector(diagram, r.Followup, r.Unread, "StateFlow", "重新待处理", "");
  addLinkedConnector(diagram, r.Read, r.Deleted, "StateFlow", "删除已读反馈", "");
  addLinkedConnector(diagram, r.Resolved, r.Deleted, "StateFlow", "删除已解决反馈", "");
  saveDiagram(diagram);
}

function createActivityDiagram(pkg) {
  var r = {};
  var diagram = addDiagram(pkg, "06_活动图_地点浏览与互动", "Activity", "从进入网站到地点浏览、登录判断、互动和路线规划的主流程。");
  var nodes = [
    ["Start", "开始", "ActivityInitial", 40, 440, 80, 45],
    ["Open", "打开海口旅行网站", "Action", 180, 440, 140, 55],
    ["Init", "加载用户、位置、公告、推荐数据", "Action", 380, 440, 210, 55],
    ["Browse", "浏览/搜索/筛选地点", "Action", 650, 440, 170, 55],
    ["Detail", "查看地点详情和地图标记", "Action", 650, 330, 190, 55],
    ["LoginDecision", "是否已登录？", "Decision", 430, 330, 130, 55],
    ["Login", "登录/注册/重置密码", "Action", 180, 330, 160, 55],
    ["GuestRoute", "游客可进行路线导航", "Action", 650, 220, 180, 55],
    ["Interact", "收藏、点赞、评论、回复", "Action", 380, 220, 190, 55],
    ["Recommend", "提交用户推荐地点", "Action", 120, 220, 170, 55],
    ["Forum", "进入论坛发帖/评论/打call", "Action", 120, 110, 210, 55],
    ["Feedback", "提交反馈并查看通知", "Action", 380, 110, 190, 55],
    ["Route", "选择收藏地点生成路线规划", "Action", 650, 110, 210, 55],
    ["End", "结束", "ActivityFinal", 430, 0, 80, 45]
  ];
  for (var i = 0; i < nodes.length; i += 1) {
    addElement(pkg, nodes[i][0], nodes[i][1], nodes[i][2], "", "", r);
    addDiagramObject(diagram, r[nodes[i][0]], nodes[i][3], nodes[i][4], nodes[i][5], nodes[i][6]);
  }
  addLinkedConnector(diagram, r.Start, r.Open, "ControlFlow", "", "");
  addLinkedConnector(diagram, r.Open, r.Init, "ControlFlow", "", "");
  addLinkedConnector(diagram, r.Init, r.Browse, "ControlFlow", "", "");
  addLinkedConnector(diagram, r.Browse, r.Detail, "ControlFlow", "", "");
  addLinkedConnector(diagram, r.Detail, r.LoginDecision, "ControlFlow", "", "");
  addLinkedConnector(diagram, r.LoginDecision, r.GuestRoute, "ControlFlow", "否", "");
  addLinkedConnector(diagram, r.LoginDecision, r.Interact, "ControlFlow", "是", "");
  addLinkedConnector(diagram, r.LoginDecision, r.Login, "ControlFlow", "需要账号", "");
  addLinkedConnector(diagram, r.Login, r.Interact, "ControlFlow", "登录成功", "");
  addLinkedConnector(diagram, r.Interact, r.Recommend, "ControlFlow", "可选", "");
  addLinkedConnector(diagram, r.Interact, r.Feedback, "ControlFlow", "产生通知/反馈", "");
  addLinkedConnector(diagram, r.Recommend, r.Forum, "ControlFlow", "继续互动", "");
  addLinkedConnector(diagram, r.Forum, r.Feedback, "ControlFlow", "论坛通知", "");
  addLinkedConnector(diagram, r.GuestRoute, r.Route, "ControlFlow", "", "");
  addLinkedConnector(diagram, r.Interact, r.Route, "ControlFlow", "使用收藏地点", "");
  addLinkedConnector(diagram, r.Feedback, r.End, "ControlFlow", "", "");
  addLinkedConnector(diagram, r.Route, r.End, "ControlFlow", "", "");
  saveDiagram(diagram);
}

function main() {
  log("开始创建海口旅行网站 UML 模型...");
  var root = getRootPackage();
  var model = createUniquePackage(root, "海口旅行网站UML模型");
  model.Notes = "由 docs/uml/ea-create-haikou-uml.js 自动创建，基于 haikou-guide React + Express 项目。";
  model.Update();

  var usecasePkg = addPackage(model, "1_用例模型");
  var classPkg = addPackage(model, "2_静态结构模型");
  var sequencePkg = addPackage(model, "3_交互模型");
  var behaviorPkg = addPackage(model, "4_行为模型");

  createUseCaseDiagram(usecasePkg);
  createClassDiagram(classPkg);
  createLoginSequenceDiagram(sequencePkg);
  createCommentSequenceDiagram(sequencePkg);
  createFeedbackStateDiagram(behaviorPkg);
  createActivityDiagram(behaviorPkg);

  Repository.RefreshModelView(model.PackageID);
  log("完成：请在项目浏览器中打开“海口旅行网站UML模型”下的 6 张图并截图。");
}

main();
