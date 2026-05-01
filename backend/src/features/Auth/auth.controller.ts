import type { Request, Response } from "express";
import { AuthService, AuthServiceError } from "./auth.service.js";
import type { LoginBody, RegisterBody } from "./auth.schema.js";
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
				message: "An error occurred",
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
				message: "An error occurred",
			});
		}
	};
}
