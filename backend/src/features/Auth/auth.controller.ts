import type { Request, Response } from "express";
import { AuthService, AuthServiceError } from "./auth.service.js";
import type {
	ChangePasswordBody,
	ForgotPasswordBody,
	LoginBody,
	RegisterBody,
	ResendVerificationBody,
	ResetPasswordBody,
	VerifyEmailBody,
} from "./auth.schema.js";
import { getAuthUser } from "./auth.middleware.js";
import type { LoginResponse } from "./auth.types.js";
import type { ErrorResponse } from "../../shared/error.responses.types.js";

export class AuthController {
	constructor(private authService: AuthService) {}

	public login = async (
		req: Request<{}, LoginResponse | ErrorResponse, LoginBody>,
		res: Response<LoginResponse | ErrorResponse>,
	) => {
		try {
			const loginResponse = await this.authService.login(req.body);
			return res.status(200).json(loginResponse);
		} catch (error) {
			if (error instanceof AuthServiceError) {
				return res.status(error.statusCode).json({
					status: "error",
					message: error.message,
				});
			}

			return res.status(500).json({
				status: "error",
				message: "Ocurrió un error inesperado en el servidor.",
			});
		}
	};

	public register = async (
		req: Request<{}, LoginResponse | ErrorResponse, RegisterBody>,
		res: Response<LoginResponse | ErrorResponse>,
	) => {
		try {
			const registerResponse = await this.authService.register(req.body);
			return res.status(201).json(registerResponse);
		} catch (error) {
			if (error instanceof AuthServiceError) {
				return res.status(error.statusCode).json({
					status: "error",
					message: error.message,
				});
			}

			return res.status(500).json({
				status: "error",
				message: "Ocurrió un error inesperado en el servidor.",
			});
		}
	};

	public verifyEmail = async (
		req: Request<{}, unknown, VerifyEmailBody>,
		res: Response,
	) => {
		try {
			const result = await this.authService.verifyEmail(req.body.token);
			return res.status(200).json(result);
		} catch (error) {
			if (error instanceof AuthServiceError) {
				return res
					.status(error.statusCode)
					.json({ status: "error", message: error.message });
			}
			return res.status(500).json({
				status: "error",
				message: "Ocurrió un error inesperado en el servidor.",
			});
		}
	};

	public resendVerification = async (
		req: Request<{}, unknown, ResendVerificationBody>,
		res: Response,
	) => {
		try {
			const result = await this.authService.resendVerification(req.body.email);
			return res.status(200).json(result);
		} catch (error) {
			return this.fail(res, error);
		}
	};

	public changePassword = async (
		req: Request<{}, unknown, ChangePasswordBody>,
		res: Response,
	) => {
		try {
			const user = getAuthUser(req);
			if (!user) {
				return res
					.status(401)
					.json({ status: "error", message: "No autenticado." });
			}
			await this.authService.changePassword(
				user.id,
				req.body.current_password,
				req.body.new_password,
			);
			return res.status(200).json({ status: "ok" });
		} catch (error) {
			return this.fail(res, error);
		}
	};

	public forgotPassword = async (
		req: Request<{}, unknown, ForgotPasswordBody>,
		res: Response,
	) => {
		try {
			const result = await this.authService.forgotPassword(req.body.email);
			return res.status(200).json(result);
		} catch (error) {
			return this.fail(res, error);
		}
	};

	public resetPassword = async (
		req: Request<{}, unknown, ResetPasswordBody>,
		res: Response,
	) => {
		try {
			await this.authService.resetPassword(
				req.body.token,
				req.body.new_password,
			);
			return res.status(200).json({ status: "ok" });
		} catch (error) {
			return this.fail(res, error);
		}
	};

	private fail(res: Response, error: unknown) {
		if (error instanceof AuthServiceError) {
			return res
				.status(error.statusCode)
				.json({ status: "error", message: error.message });
		}
		return res.status(500).json({
			status: "error",
			message: "Ocurrió un error inesperado en el servidor.",
		});
	}
}
