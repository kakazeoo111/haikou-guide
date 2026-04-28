import { parseImageEntries, parseImageUrls } from "./imageEntryUtils";

export function parseForumImageEntries(rawValue) {
  return parseImageEntries(rawValue);
}

export function parseForumImageUrls(rawValue) {
  return parseImageUrls(rawValue);
}
