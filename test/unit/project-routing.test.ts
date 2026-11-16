// Import Helpers
import "../setup/test-env";
// Import Library
import assert from "node:assert/strict";
import { describe, it } from "node:test";
// Import Projects
import { getProjectUrl, resolveProjectRoute } from "../../src/projects";

/* -------------------------------------- Config -------------------------------------- */

// Config token ตัวอย่างรูปแบบเดียวกับ LINE action token ของ Labor (32 ตัว base64url)
const LABOR_TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz012_-9";

/* -------------------------------------- Tests -------------------------------------- */

describe("resolveProjectRoute", () => {
  it("ส่งปุ่มยืนยัน/ตีกลับของ Labor ไป labor", () => {
    const project = resolveProjectRoute({ type: "postback", postback: { data: `token=${LABOR_TOKEN}` } });

    assert.equal(project.name, "labor");
    assert.equal(getProjectUrl(project), "http://labor.test/api/line/webhook");
  });

  it("ส่งปุ่มให้คะแนนของ Labor ไป labor", () => {
    assert.equal(resolveProjectRoute({ type: "postback", postback: { data: `token=${LABOR_TOKEN}&score=5` } }).name, "labor");
  });

  it("ส่งข้อความ id (ไม่สนตัวพิมพ์และช่องว่าง) ไป labor", () => {
    assert.equal(resolveProjectRoute({ type: "message", message: { type: "text", text: " ID " } }).name, "labor");
  });

  it("ส่ง postback ที่มี key อื่นปนไป default", () => {
    assert.equal(resolveProjectRoute({ type: "postback", postback: { data: `token=${LABOR_TOKEN}&menu=home` } }).name, "default");
  });

  it("ส่ง postback ที่ token ผิดรูปแบบไป default", () => {
    assert.equal(resolveProjectRoute({ type: "postback", postback: { data: "token=short" } }).name, "default");
  });

  it("ส่ง postback ของระบบอื่นไป default", () => {
    assert.equal(resolveProjectRoute({ type: "postback", postback: { data: "action=open_menu" } }).name, "default");
  });

  it("ส่งข้อความทั่วไป, sticker และ follow ไป default", () => {
    assert.equal(resolveProjectRoute({ type: "message", message: { type: "text", text: "id please" } }).name, "default");
    assert.equal(resolveProjectRoute({ type: "message", message: { type: "sticker" } }).name, "default");
    assert.equal(resolveProjectRoute({ type: "follow" }).name, "default");
  });
});
