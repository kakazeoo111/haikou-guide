import { buildUploadedImagePayload, getUploadedImageAndThumbFiles } from "./uploadImagePayload.js";

function normalizeUploadedImages(files) {
  const { images, thumbnails } = getUploadedImageAndThumbFiles(files);
  return buildUploadedImagePayload(images, thumbnails);
}

async function ensureRecommendationTables(pool) {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS recommendations (
      id INT NOT NULL AUTO_INCREMENT,
      user_phone VARCHAR(20) NOT NULL,
      place_name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      lat DECIMAL(10,7) NULL,
      lng DECIMAL(10,7) NULL,
      image_url LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_recommendations_created (created_at),
      KEY idx_recommendations_user_phone (user_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS recommendation_likes (
      id INT NOT NULL AUTO_INCREMENT,
      phone VARCHAR(20) NOT NULL,
      recommendation_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_recommendation_like_phone_rec (phone, recommendation_id),
      KEY idx_recommendation_likes_rec (recommendation_id),
      KEY idx_recommendation_likes_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

const RECOMMENDATION_LIST_SQL = `
  SELECT r.*, u.username, u.avatar_url,
         COALESCE(all_likes.like_count, 0) AS like_count,
         COALESCE(my_likes.is_liked, 0) AS is_liked
  FROM recommendations r
  JOIN users u ON r.user_phone COLLATE utf8mb4_general_ci = u.phone COLLATE utf8mb4_general_ci
  LEFT JOIN (
    SELECT recommendation_id, COUNT(*) AS like_count
    FROM recommendation_likes
    GROUP BY recommendation_id
  ) all_likes ON all_likes.recommendation_id = r.id
  LEFT JOIN (
    SELECT recommendation_id, 1 AS is_liked
    FROM recommendation_likes
    WHERE phone COLLATE utf8mb4_general_ci = ?
    GROUP BY recommendation_id
  ) my_likes ON my_likes.recommendation_id = r.id
  ORDER BY r.created_at DESC
`;

export async function registerRecommendationRoutes(app, { pool, upload, addNotice }) {
  await ensureRecommendationTables(pool);

  app.get("/api/recommendations", async (req, res) => {
    const { phone } = req.query;
    try {
      const [rows] = await pool.execute(RECOMMENDATION_LIST_SQL, [phone || ""]);
      const data = rows.map((row) => ({ ...row, is_liked: row.is_liked > 0 }));
      res.json({ ok: true, data });
    } catch (error) {
      console.error("��ȡ�Ƽ�ʧ��:", error.message);
      res.status(500).json({ ok: false, message: `��ȡ�Ƽ�ʧ��: ${error.message}` });
    }
  });

  app.post("/api/recommendations/add", upload.fields([{ name: "images", maxCount: 9 }, { name: "thumbnails", maxCount: 9 }]), async (req, res) => {
    const { phone, place_name, description, lat, lng } = req.body;
    const imageUrls = normalizeUploadedImages(req.files);
    try {
      await pool.execute(
        "INSERT INTO recommendations (user_phone, place_name, description, lat, lng, image_url) VALUES (?, ?, ?, ?, ?, ?)",
        [phone, place_name, description || "", lat, lng, JSON.stringify(imageUrls)]
      );
      res.json({ ok: true, message: "�Ƽ��ɹ�" });
    } catch (error) {
      console.error("�ύ�Ƽ�ʧ��:", error.message);
      res.status(500).json({ ok: false, message: `�ύ�Ƽ�ʧ��: ${error.message}` });
    }
  });

  app.post("/api/recommendations/like", async (req, res) => {
    const { phone, recId } = req.body;
    try {
      const id = parseInt(recId, 10);
      const [rows] = await pool.execute(
        "SELECT id FROM recommendation_likes WHERE phone COLLATE utf8mb4_general_ci = ? AND recommendation_id = ?",
        [phone, id]
      );
      if (rows.length > 0) {
        await pool.execute("DELETE FROM recommendation_likes WHERE phone COLLATE utf8mb4_general_ci = ? AND recommendation_id = ?", [phone, id]);
        return res.json({ ok: true, action: "unliked" });
      }
      await pool.execute("INSERT INTO recommendation_likes (phone, recommendation_id) VALUES (?, ?)", [phone, id]);
      const [owner] = await pool.execute("SELECT user_phone FROM recommendations WHERE id = ?", [id]);
      if (owner.length > 0) await addNotice(owner[0].user_phone, phone, "like_place", `rec_${id}`);
      res.json({ ok: true, action: "liked" });
    } catch (error) {
      console.error("�Ƽ�����ʧ��:", error.message);
      res.status(500).json({ ok: false, message: `�Ƽ�����ʧ��: ${error.message}` });
    }
  });

  app.post("/api/recommendations/delete", async (req, res) => {
    const { phone, recId } = req.body;
    try {
      const [result] = await pool.execute(
        "DELETE FROM recommendations WHERE id = ? AND user_phone COLLATE utf8mb4_general_ci = ?",
        [recId, phone]
      );
      res.json({ ok: result.affectedRows > 0 });
    } catch (error) {
      console.error("ɾ���Ƽ�ʧ��:", error.message);
      res.status(500).json({ ok: false, message: `ɾ���Ƽ�ʧ��: ${error.message}` });
    }
  });
}
