import { Router } from "express";
import * as C from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate, zod as z } from "../../middleware/validate.js";
import { authLimiter } from "../../config/rateLimit.js";

const router = Router();

const registerSchema = z.object({
  body: z.object({
    first_name: z.string().min(1).max(80),
    last_name: z.string().min(1).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    phone_number: z.string().max(32).optional()
  })
});
const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128)
  })
});
const forgotSchema = z.object({
  body: z.object({ email: z.string().email() })
});
const resetSchema = z.object({
  body: z.object({ token: z.string().min(10), password: z.string().min(8).max(128) })
});
const resendSchema = z.object({
  body: z.object({ email: z.string().email() })
});

// public
router.post("/register", authLimiter, validate(registerSchema), C.register);
router.post("/login", authLimiter, validate(loginSchema), C.login);
router.post("/refresh", C.refresh);
router.post("/logout", C.logout); // uses refresh token in body (or header)

router.post("/verify/resend", validate(resendSchema), C.resendVerification);
router.get("/verify", C.verifyEmail); // ?token=...

router.post("/forgot-password", authLimiter, validate(forgotSchema), C.forgotPassword);
router.post("/reset-password", authLimiter, validate(resetSchema), C.resetPassword);

// example protected route
router.get("/me", requireAuth, C.me);

export default router;
