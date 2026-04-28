import { parseImageEntries, parseImageUrls } from "./imageEntryUtils";

export function parseFeedbackImageEntries(rawValue) {
  return parseImageEntries(rawValue);
}

export function parseFeedbackImageUrls(rawValue) {
  return parseImageUrls(rawValue);
}
