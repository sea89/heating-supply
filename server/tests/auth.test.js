import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import db from "../../src/config/database.js";
import bcrypt from "bcryptjs";

const app = createTestApp();

describe("Auth API", () => {
  beforeAll(async () => {
    // Seed a test user
    const hash = await bcrypt.hash("123456", 10);
    await db("users").insert({
      username: "testuser",
      password_hash: hash,
      name: "测试用户",
      role: "maintenance",
    });
  });

  afterAll(async () => {
    await db("users").where({ username: "testuser" }).del();
    await db.destroy();
  });

  it("should login successfully with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "testuser", password: "123456" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("username", "testuser");
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("should reject wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "testuser", password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("用户名或密码错误");
  });

  it("should reject non-existent user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nobody", password: "123456" });
    expect(res.status).toBe(401);
  });

  it("should rate-limit after 5 failed attempts", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ username: "testuser", password: "wrongpass" });
    }
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "testuser", password: "123456" });
    expect(res.status).toBe(429);
    expect(res.body.error).toContain("过于频繁");
  });
});
