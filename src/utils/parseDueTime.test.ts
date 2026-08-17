import test from "node:test";
import assert from "node:assert/strict";
import dayjs from "dayjs";
import { parseDueTimeFromText } from "./parseDueTime.ts";

test("detects clock-time token with dot and keeps due timestamp", () => {
  const parsed = parseDueTimeFromText("Call team 12:15.", dayjs("2026-09-03T00:00:00Z"));
  assert.equal(parsed.cleanedText, "Call team");
  assert.equal(parsed.dueTimestamp, dayjs("2026-09-03T12:15:00Z").unix());
  assert.equal(parsed.openCalendar, true);
});

test("detects hour shorthand with dot and uses selected day", () => {
  const parsed = parseDueTimeFromText("Review 2h.", dayjs("2026-09-03T00:00:00Z"));
  assert.equal(parsed.cleanedText, "Review");
  assert.equal(parsed.dueTimestamp, dayjs("2026-09-03T02:00:00Z").unix());
  assert.equal(parsed.openCalendar, true);
});

test("detects minute-suffixed hours and today date fallback", () => {
  const parsed = parseDueTimeFromText("Send update 20h45", dayjs("2026-09-03T00:00:00Z"));
  assert.equal(parsed.cleanedText, "Send update");
  assert.equal(parsed.dueTimestamp, dayjs("2026-09-03T20:45:00Z").unix());
  assert.equal(parsed.openCalendar, undefined);
});

test("does not allow a note made only of parsed time", () => {
  const parsed = parseDueTimeFromText("12:15", dayjs("2026-09-03T00:00:00Z"));
  assert.equal(parsed.cleanedText, "");
  assert.equal(parsed.dueTimestamp, dayjs("2026-09-03T12:15:00Z").unix());
});
