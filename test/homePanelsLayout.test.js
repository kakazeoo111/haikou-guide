import test from "node:test";
import assert from "node:assert/strict";
import { getHomePanelsLayoutStyles } from "../src/logic/homePanelsLayout.js";

test("desktop home panels give the map a stable right-side viewport area", () => {
  const { wrapStyle, mapPanelStyle, listPanelStyle } = getHomePanelsLayoutStyles(false);

  assert.equal(wrapStyle.display, "flex");
  assert.equal(wrapStyle.flexDirection, "row-reverse");
  assert.equal(wrapStyle.height, "100vh");
  assert.equal(mapPanelStyle.flex, 1);
  assert.equal(mapPanelStyle.height, "100vh");
  assert.equal(listPanelStyle.width, "380px");
  assert.equal(listPanelStyle.height, "100vh");
});

test("mobile home panels keep the existing map-above-list layout", () => {
  const { wrapStyle, mapPanelStyle, listPanelStyle } = getHomePanelsLayoutStyles(true);

  assert.equal(wrapStyle.flexDirection, "column");
  assert.equal(mapPanelStyle.width, "100%");
  assert.equal(mapPanelStyle.height, "30vh");
  assert.equal(listPanelStyle.width, "100%");
  assert.equal(listPanelStyle.height, "70vh");
});
