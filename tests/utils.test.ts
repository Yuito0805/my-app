import assert from "node:assert/strict";
import test from "node:test";
import { formatRelativeDate } from "../src/utils/date-format.ts";
import { getSafeReturnTo, isAllowedSchoolEmail, normalizeEmail } from "../src/utils/validation.ts";

test("メールアドレスを正規化し許可ドメインを判定する", () => {
  assert.equal(normalizeEmail(" Sample@KEIO.JP "), "sample@keio.jp");
  assert.equal(isAllowedSchoolEmail("sample@keio.jp"), true);
  assert.equal(isAllowedSchoolEmail("sample@example.com"), false);
});

test("外部URLへのリダイレクトを防ぐ", () => {
  assert.equal(getSafeReturnTo("/mypage?tab=recent#top", "/"), "/mypage?tab=recent");
  assert.equal(getSafeReturnTo("//example.com", "/"), "/");
  assert.equal(getSafeReturnTo("https://example.com", "/mypage"), "/mypage");
});

test("相対時刻を日本語で表示する", () => {
  const now = new Date("2026-07-15T12:00:00Z");
  assert.equal(formatRelativeDate(new Date("2026-07-15T11:30:00Z"), now), "30分前");
  assert.equal(formatRelativeDate(new Date("2026-07-13T12:00:00Z"), now), "2日前");
});
