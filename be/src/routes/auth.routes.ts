import { Router } from "express";
import { z } from "zod";
import {validateRequest} from "../middlewares/validate.middleware";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// Zod Schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(6),
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })
});

// đổi name HOẶC đổi password. Nếu đổi password thì bắt buộc có currentPassword
const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(6).optional(),
  }).refine(data => {
    // Nếu có newPassword thì bắt buộc phải có currentPassword
    if (data.newPassword && !data.currentPassword) return false;
    return true;
  }, {
    message: "Current password is required when changing password",
    path: ["currentPassword"], // Đính lỗi vào trường currentPassword
  })
});

// Routes
router.post("/register", validateRequest(registerSchema), authController.register);
router.post("/login", validateRequest(loginSchema), authController.login);
router.post("/logout", requireAuth, authController.logout);
router.post("/refresh", authController.refresh);
router.get("/me", requireAuth, authController.getMe);
router.patch("/me", requireAuth, validateRequest(updateMeSchema), authController.updateMe);

export default router;