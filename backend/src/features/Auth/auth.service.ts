import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../../database/prisma.js";
import type { LoginBody } from "./auth.schema.js";
import type { AuthUser, LoginResponse } from "./auth.types.js";

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
	async login(body: LoginBody): Promise<LoginResponse> {
		const user = await prisma.users.findUnique({
			where: { email: body.email },
			select: {
				id: true,
				email: true,
				password: true,
				role: true,
			},
		});

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

		const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1d") as NonNullable<
			SignOptions["expiresIn"]
		>;

		const authUser: AuthUser = {
			id: user.id,
			email: user.email,
			role: user.role,
		};

		const token = jwt.sign(
			{
				sub: authUser.id,
				email: authUser.email,
				role: authUser.role,
			},
			secret,
			{ expiresIn },
		);

		return {
			token,
			user: authUser,
		};
	}
}
