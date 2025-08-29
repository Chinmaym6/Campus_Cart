import { Router } from "express";
import * as controller from "./auth.controller.js";

const r = Router();

r.post("/register", controller.register);
r.post("/login", controller.login);
r.get("/me", controller.me);

// NEW: email verification endpoint
r.get("/verify-email", controller.verifyEmail);

r.post("/forgot-password", controller.forgotPassword);
r.get("/reset-password/validate", controller.validateResetToken); // optional precheck
r.post("/reset-password", controller.resetPassword);
export default r;
