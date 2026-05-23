// Test helper: creates an Express app instance for supertest
import "dotenv/config";
import express from "express";
import cors from "cors";

// Import models directly instead of routes to avoid require cycles
import errorHandler from "../src/middleware/errorHandler.js";

// Recreate routes with test db connection
import authRoutes from "../src/routes/auth.js";
import inventoryRoutes from "../src/routes/inventory.js";
import purchasesRoutes from "../src/routes/purchases.js";

export function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/purchases", purchasesRoutes);

  app.use(errorHandler);
  return app;
}
