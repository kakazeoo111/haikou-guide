import { describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDirectionUrl,
  buildRelationNodes,
  isValidCoordinate,
  mapSelectedPlaces,
  normalizePoi,
  toCoordinateText,
} from "../src/logic/routePlannerUtils.js";

describe("RoutePlannerUtils route planning module", () => {
  test("isValidCoordinate accepts numeric coordinate values and rejects invalid values", () => {
    assert.equal(isValidCoordinate(20.031957), true);
    assert.equal(isValidCoordinate("110.331398"), true);
    assert.equal(isValidCoordinate(""), true);
    assert.equal(isValidCoordinate("not-a-number"), false);
    assert.equal(isValidCoordinate(undefined), false);
  });

  test("normalizePoi returns a normalized point from mocked Baidu POI data", () => {
    const mockedBaiduPoi = {
      title: "骑楼老街",
      address: "海口市龙华区",
      point: { lat: "20.04603", lng: "110.350885" },
    };

    assert.deepEqual(normalizePoi(mockedBaiduPoi), {
      name: "骑楼老街",
      address: "海口市龙华区",
      lat: 20.04603,
      lng: 110.350885,
    });
  });

  test("normalizePoi returns null when mocked Baidu POI coordinates are invalid", () => {
    const mockedInvalidPoi = { title: "无效地点", point: { lat: "abc", lng: 110 } };

    assert.equal(normalizePoi(mockedInvalidPoi), null);
  });

  test("buildDirectionUrl builds a Baidu driving route URL with waypoints", () => {
    const routeUrl = buildDirectionUrl({
      origin: toCoordinateText(20.01, 110.31),
      destination: toCoordinateText(20.04, 110.34),
      waypoints: [toCoordinateText(20.02, 110.32), toCoordinateText(20.03, 110.33)],
    });
    const parsed = new URL(routeUrl);

    assert.equal(parsed.origin + parsed.pathname, "https://api.map.baidu.com/direction");
    assert.equal(parsed.searchParams.get("origin"), "20.01,110.31");
    assert.equal(parsed.searchParams.get("destination"), "20.04,110.34");
    assert.equal(parsed.searchParams.get("mode"), "driving");
    assert.equal(parsed.searchParams.get("region"), "海口");
    assert.equal(parsed.searchParams.get("output"), "html");
    assert.equal(parsed.searchParams.get("waypoints"), "20.02,110.32|20.03,110.33");
  });

  test("buildDirectionUrl calls mocked URLSearchParams.set when route has waypoints", (t) => {
    const setSpy = mock.method(URLSearchParams.prototype, "set");
    t.after(() => setSpy.mock.restore());

    buildDirectionUrl({
      origin: toCoordinateText(20.01, 110.31),
      destination: toCoordinateText(20.04, 110.34),
      waypoints: [toCoordinateText(20.02, 110.32)],
    });

    assert.equal(setSpy.mock.callCount(), 1);
    assert.deepEqual(setSpy.mock.calls[0].arguments, ["waypoints", "20.02,110.32"]);
  });

  test("buildDirectionUrl does not call mocked URLSearchParams.set without waypoints", (t) => {
    const setSpy = mock.method(URLSearchParams.prototype, "set");
    t.after(() => setSpy.mock.restore());

    buildDirectionUrl({
      origin: toCoordinateText(20.01, 110.31),
      destination: toCoordinateText(20.04, 110.34),
      waypoints: [],
    });

    assert.equal(setSpy.mock.callCount(), 0);
  });

  test("mapSelectedPlaces keeps favorite places in the user's selected order", () => {
    const favoritePlaces = [
      { id: 1, name: "云洞图书馆" },
      { id: "rec_8", name: "用户推荐点" },
      { id: 3, name: "假日海滩" },
    ];

    assert.deepEqual(mapSelectedPlaces(favoritePlaces, ["3", "1"]), [
      { id: 3, name: "假日海滩" },
      { id: 1, name: "云洞图书馆" },
    ]);
  });

  test("buildRelationNodes converts a route into display nodes", () => {
    assert.deepEqual(
      buildRelationNodes(
        { name: "我的位置" },
        [
          { name: "云洞图书馆", type: "view" },
          { name: "骑楼老街", type: "street" },
          { name: "用户推荐点", type: "recommend" },
        ],
      ),
      [
        { name: "我的位置", type: "起点" },
        { name: "云洞图书馆", type: "景点" },
        { name: "骑楼老街", type: "地点" },
        { name: "用户推荐点", type: "推荐" },
      ],
    );
  });
});
