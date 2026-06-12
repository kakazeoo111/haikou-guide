import test from "node:test";
import assert from "node:assert/strict";
import { buildUploadedImagePayload, getUploadedImageAndThumbFiles } from "../server/uploadImagePayload.js";

test("getUploadedImageAndThumbFiles extracts image and thumbnail file groups", () => {
  const files = {
    images: [{ filename: "place.jpg" }],
    thumbnails: [{ filename: "place-thumb.jpg" }],
  };

  assert.deepEqual(getUploadedImageAndThumbFiles(files), files);
});

test("getUploadedImageAndThumbFiles treats an array as image files without thumbnails", () => {
  const files = [{ filename: "avatar.jpg" }];

  assert.deepEqual(getUploadedImageAndThumbFiles(files), {
    images: files,
    thumbnails: [],
  });
});

test("buildUploadedImagePayload returns strings when thumbnails are missing", () => {
  assert.deepEqual(buildUploadedImagePayload([{ filename: "a.jpg" }], []), [
    "https://api.suzcore.top/uploads/a.jpg",
  ]);
});

test("buildUploadedImagePayload pairs each image with its matching thumbnail", () => {
  assert.deepEqual(
    buildUploadedImagePayload(
      [{ filename: "a.jpg" }, { filename: "b.jpg" }],
      [{ filename: "a-thumb.jpg" }],
    ),
    [
      {
        url: "https://api.suzcore.top/uploads/a.jpg",
        thumbnail: "https://api.suzcore.top/uploads/a-thumb.jpg",
      },
      "https://api.suzcore.top/uploads/b.jpg",
    ],
  );
});

test("buildUploadedImagePayload ignores image entries without filenames", () => {
  assert.deepEqual(buildUploadedImagePayload([{ filename: "" }, null, { filename: "ok.webp" }], []), [
    "https://api.suzcore.top/uploads/ok.webp",
  ]);
});
