import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Prisma } from "../../generated/prisma/client.js";
import type { LoginBody, RegisterBody } from "./auth.schema.js";
import type { AuthUser, LoginResponse } from "./auth.types.js";
import type { AuthRepository } from "./auth.repository.js";

export class AuthServiceError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
	) {
		super(message);
		this.name = "AuthServiceError";
	}
}

export class AuthService {
	constructor(private authRepository: AuthRepository) {}
	async login(body: LoginBody): Promise<LoginResponse> {

		const user = await this.authRepository.findUserByEmail(body.email);

		if (!user) {
			throw new AuthServiceError("Invalid email or password", 401);
		}

		const isPasswordValid = await bcrypt.compare(body.password, user.password);

		if (!isPasswordValid) {
			throw new AuthServiceError("Invalid email or password", 401);
		}

		const secret = process.env.JWT_SECRET?.trim();

		if (!secret) {
			throw new AuthServiceError("JWT_SECRET is not configured", 500);
		}

		return this.buildAuthResponse({
			id: user.id,
			email: user.email,
			role: user.role,
		});
	}

	async register(body: RegisterBody): Promise<LoginResponse> {
		try {
			const user = await this.authRepository.createUser(body.email, await bcrypt.hash(body.password, 10), body.role);

			return this.buildAuthResponse(user);
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new AuthServiceError("El email ya se encuentra registrado", 409);
			}

			throw error;
		}
	}

	private buildAuthResponse(user: AuthUser): LoginResponse {
		const secret = process.env.JWT_SECRET?.trim();

		if (!secret) {
			throw new AuthServiceError("JWT_SECRET is not configured", 500);
		}

		const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1d") as NonNullable<
			SignOptions["expiresIn"]
		>;

		const token = jwt.sign(
			{
				sub: user.id,
				email: user.email,
				role: user.role,
			},
			secret,
			{ expiresIn },
		);

		return {
			token,
			user,
		};
	}
}
