import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const ok = (name) => jest.fn((req, res) => res.status(200).json({ handler: name, user: req.user || null }));
const handlers = {
  listCoupons: ok("listCoupons"),
  listPublicCoupons: ok("listPublicCoupons"),
  createCoupon: ok("createCoupon"),
  updateCoupon: ok("updateCoupon"),
  deleteCoupon: ok("deleteCoupon"),
  validateCoupon: ok("validateCoupon"),
};
jest.unstable_mockModule("../app/controller/couponController.js", () => handlers);

const { default: couponRoutes } = await import("../app/routes/couponRoutes.js");
const app = express();
app.use(express.json());
app.use("/api", couponRoutes);

const token = (role) => `Bearer ${jwt.sign({ id: `u-${role}`, role }, process.env.JWT_SECRET)}`;

describe("coupon routes auth", () => {
  test.each([
    ["get", "/api/admin/coupons"],
    ["post", "/api/admin/coupons"],
    ["put", "/api/admin/coupons/abc"],
    ["delete", "/api/admin/coupons/abc"],
  ])("%s %s rejects anonymous (401) and customers (403), allows admin", async (method, url) => {
    expect((await request(app)[method](url)).status).toBe(401);
    expect((await request(app)[method](url).set("Authorization", token("customer"))).status).toBe(403);
    expect((await request(app)[method](url).set("Authorization", token("admin"))).status).toBe(200);
  });

  test("GET /coupons (checkout list) is public and uses the creator-free list", async () => {
    const r = await request(app).get("/api/coupons");
    expect(r.status).toBe(200);
    expect(r.body.handler).toBe("listPublicCoupons");
  });

  test("POST /coupons/validate attaches the logged-in user when a token is sent", async () => {
    const r = await request(app).post("/api/coupons/validate").set("Authorization", token("customer")).send({ code: "X" });
    expect(r.body.user).toMatchObject({ id: "u-customer", role: "customer" });
    const anon = await request(app).post("/api/coupons/validate").send({ code: "X" });
    expect(anon.status).toBe(200);
  });
});
