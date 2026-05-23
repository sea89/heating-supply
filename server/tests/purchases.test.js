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
let purchaseOrderId;

describe("Purchase Arrival API", () => {
  beforeAll(async () => {
    const hash = await bcrypt.hash("123456", 10);
    const [user] = await db("users").insert({
      username: "purtest",
      password_hash: hash,
      name: "Purchase Tester",
      role: "procurement",
    }).returning("id");
    const uid = user?.id || user;
    token = jwt.sign({ id: uid, role: "procurement" }, process.env.JWT_SECRET);

    const [part] = await db("parts").insert({
      code: "P001", name: "Purchase Part", unit: "pcs", unit_price: 5.00,
    }).returning("id");
    partId = part?.id || part;

    const [loc] = await db("locations").insert({
      warehouse: "Main", shelf: "B", bin: "02"
    }).returning("id");
    locationId = loc?.id || loc;

    // Create a purchase order with 10 units
    const [po] = await db("purchase_orders").insert({
      order_no: "PO-TEST-001",
      status: "ordered",
      created_by: uid,
    }).returning("id");
    purchaseOrderId = po?.id || po;

    // Add purchase order item
    await db("purchase_order_items").insert({
      purchase_order_id: purchaseOrderId,
      part_id: partId,
      quantity: 10,
      unit_price: 5.00,
      total_price: 50.00,
    });
  });

  afterAll(async () => {
    await db("purchase_order_items").where({ purchase_order_id: purchaseOrderId }).del();
    await db("purchase_orders").where({ id: purchaseOrderId }).del();
    await db("stock_records").where({ part_id: partId }).del();
    await db("inbound_records").where({ part_id: partId }).del();
    await db("locations").where({ id: locationId }).del();
    await db("parts").where({ id: partId }).del();
    await db("users").where({ username: "purtest" }).del();
    await db.destroy();
  });

  it("should process arrival and auto-create stock + inbound record", async () => {
    const res = await request(app)
      .post(`/api/purchases/${purchaseOrderId}/arrival`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{
          item_id: null,
          arrived_quantity: 5,
          location_id: locationId,
        }]
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify stock record created
    const stock = await db("stock_records").where({ part_id: partId, location_id: locationId }).first();
    expect(stock).toBeTruthy();
    expect(Number(stock.quantity)).toBe(5);

    // Verify inbound record created
    const inbound = await db("inbound_records").where({ part_id: partId, purchase_order_id: purchaseOrderId }).first();
    expect(inbound).toBeTruthy();
    expect(Number(inbound.quantity)).toBe(5);

    // Verify purchase order status updated
    const po = await db("purchase_orders").where({ id: purchaseOrderId }).first();
    expect(po.status).toBe("partial_arrived");
  });
});
