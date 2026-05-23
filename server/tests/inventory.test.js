import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/testApp.js";
import db from "../../src/config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = createTestApp();
let token;
let partId;
let locationId;

describe("Inventory API", () => {
  beforeAll(async () => {
    const hash = await bcrypt.hash("123456", 10);
    const [user] = await db("users").insert({
      username: "invtest",
      password_hash: hash,
      name: "Stock Tester",
      role: "warehouse",
    }).returning("id");
    const uid = user?.id || user;
    token = jwt.sign({ id: uid, role: "warehouse" }, process.env.JWT_SECRET);

    const [part] = await db("parts").insert({
      code: "T001", name: "Test Part", unit: "pcs", unit_price: 10.00,
    }).returning("id");
    partId = part?.id || part;

    const [loc] = await db("locations").insert({
      warehouse: "Main", shelf: "A", bin: "01"
    }).returning("id");
    locationId = loc?.id || loc;

    await db("stock_records").insert({ part_id: partId, location_id: locationId, quantity: 10 });
  });

  afterAll(async () => {
    await db("stock_records").where({ part_id: partId }).del();
    await db("locations").where({ id: locationId }).del();
    await db("parts").where({ id: partId }).del();
    await db("users").where({ username: "invtest" }).del();
    await db.destroy();
  });

  it("should outbound successfully when stock is sufficient", async () => {
    const res = await request(app)
      .post("/api/inventory/outbound")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ part_id: partId, location_id: locationId, quantity: 3 }] });
    expect(res.status).toBe(201);

    const stock = await db("stock_records").where({ part_id: partId, location_id: locationId }).first();
    expect(Number(stock.quantity)).toBe(7); // 10 - 3 = 7

    const record = await db("outbound_records").where({ part_id: partId }).first();
    expect(record).toBeTruthy();
    expect(Number(record.quantity)).toBe(3);
  });

  it("should reject outbound when stock is insufficient and rollback transaction", async () => {
    const res = await request(app)
      .post("/api/inventory/outbound")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ part_id: partId, location_id: locationId, quantity: 999 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("stock");

    // Stock must remain unchanged after rollback
    const stock = await db("stock_records").where({ part_id: partId, location_id: locationId }).first();
    expect(Number(stock.quantity)).toBe(7);
  });
});


