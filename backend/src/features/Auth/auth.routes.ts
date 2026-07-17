import { Router } from "express";
import { validate } from "../../shared/validate.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from "./auth.schema.js";
import { requireAuth } from "./auth.middleware.js";

const router = Router();

const repository = new AuthRepository();
const service = new AuthService(repository);
const controller = new AuthController(service);

router.post("/register", validate(RegisterSchema), controller.register);
router.post("/login", validate(LoginSchema), controller.login);
router.post(
  "/verify-email",
  validate(VerifyEmailSchema),
  controller.verifyEmail,
);
router.post(
  "/resend-verification",
  validate(ResendVerificationSchema),
  controller.resendVerification,
);
router.post(
  "/change-password",
  requireAuth,
  validate(ChangePasswordSchema),
  controller.changePassword,
);
router.post(
  "/forgot-password",
  validate(ForgotPasswordSchema),
  controller.forgotPassword,
);
router.post(
  "/reset-password",
  validate(ResetPasswordSchema),
  controller.resetPassword,
);

export const AuthRoutes = router;
