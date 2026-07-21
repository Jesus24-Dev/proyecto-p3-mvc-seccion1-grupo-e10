import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Prisma, roles } from "../../generated/prisma/client.js";
import type { LoginBody, RegisterBody } from "./auth.schema.js";
import type { AuthUser, LoginResponse } from "./auth.types.js";
import type { AuthRepository } from "./auth.repository.js";
import {
  magicLinkEmail,
  resetPasswordEmail,
  sendEmail,
} from "../../shared/mailer.js";

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
			throw new AuthServiceError("Correo o contraseña incorrectos.", 401);
		}

		const isPasswordValid = await bcrypt.compare(body.password, user.password);

		if (!isPasswordValid) {
			throw new AuthServiceError("Correo o contraseña incorrectos.", 401);
		}

		if (!user.email_verified) {
			throw new AuthServiceError(
				"Verifica tu correo electrónico antes de iniciar sesión.",
				403,
			);
		}

		const secret = process.env.JWT_SECRET?.trim();

		if (!secret) {
			throw new AuthServiceError("El servidor no está configurado correctamente.", 500);
		}

		return this.buildAuthResponse({
			id: user.id,
			email: user.email,
			role: user.role,
		});
	}

	async register(body: RegisterBody): Promise<LoginResponse> {
		try {
			// El registro público siempre crea cuentas USER; los roles con
			// privilegios se asignan desde el panel por un ADMIN autenticado.
			const user = await this.authRepository.createUser(body.email, await bcrypt.hash(body.password, 10), roles.USER);

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

	async verifyEmail(token: string): Promise<{ email: string }> {
		const user = await this.authRepository.findByVerificationToken(token);

		if (!user) {
			throw new AuthServiceError("El enlace de verificación no es válido.", 400);
		}

		if (user.email_verified) {
			return { email: user.email };
		}

		if (
			user.verification_expires &&
			user.verification_expires.getTime() < Date.now()
		) {
			throw new AuthServiceError(
				"El enlace de verificación expiró. Solicita uno nuevo.",
				400,
			);
		}

		await this.authRepository.markVerified(user.id);
		return { email: user.email };
	}

	async resendVerification(
		email: string,
	): Promise<{ verification_token: string | null; already_verified: boolean }> {
		const user = await this.authRepository.findUserByEmail(email);

		if (!user) {
			throw new AuthServiceError("No hay ninguna cuenta con ese correo.", 404);
		}

		if (user.email_verified) {
			return { verification_token: null, already_verified: true };
		}

		const token = randomUUID();
		await this.authRepository.setVerificationToken(
			email,
			token,
			new Date(Date.now() + 24 * 60 * 60 * 1000),
		);
		return { verification_token: token, already_verified: false };
	}

	async changePassword(
		userId: string,
		currentPassword: string,
		newPassword: string,
	): Promise<void> {
		const user = await this.authRepository.findByIdWithPassword(userId);
		if (!user) {
			throw new AuthServiceError("La cuenta no existe.", 404);
		}
		const valid = await bcrypt.compare(currentPassword, user.password);
		if (!valid) {
			throw new AuthServiceError("La contraseña actual no es correcta.", 400);
		}
		await this.authRepository.updatePassword(
			userId,
			await bcrypt.hash(newPassword, 10),
		);
	}

	async forgotPassword(
		email: string,
		baseUrl: string,
	): Promise<{ reset_token: string | null }> {
		const user = await this.authRepository.findUserByEmail(email);
		// No revelamos si el correo existe; solo devolvemos enlace si aplica.
		if (!user) {
			return { reset_token: null };
		}
		const token = randomUUID();
		await this.authRepository.setResetToken(
			email,
			token,
			new Date(Date.now() + 60 * 60 * 1000),
		);
		const link = `${baseUrl}/reset/${token}`;
		const { subject, html } = resetPasswordEmail(link);
		await sendEmail({ to: user.email, subject, html });
		return { reset_token: token };
	}

	// Enlace mágico (passwordless). No revela si el correo existe.
	async requestMagicLink(
		email: string,
		baseUrl: string,
	): Promise<{ sent: true }> {
		const user = await this.authRepository.findUserByEmail(email);
		if (!user) {
			return { sent: true };
		}
		const token = randomUUID();
		await this.authRepository.setMagicToken(
			email,
			token,
			new Date(Date.now() + 15 * 60 * 1000),
		);
		const link = `${baseUrl}/magic/${token}`;
		const { subject, html } = magicLinkEmail(link);
		await sendEmail({ to: user.email, subject, html });
		return { sent: true };
	}

	async magicLogin(token: string): Promise<LoginResponse> {
		const user = await this.authRepository.findByMagicToken(token);
		if (!user) {
			throw new AuthServiceError("El enlace ya no es válido.", 400);
		}
		if (user.magic_expires && user.magic_expires.getTime() < Date.now()) {
			throw new AuthServiceError(
				"El enlace expiró. Solicita uno nuevo.",
				400,
			);
		}
		await this.authRepository.consumeMagicToken(user.id);
		return this.buildAuthResponse({
			id: user.id,
			email: user.email,
			role: user.role,
		});
	}

	async resetPassword(token: string, newPassword: string): Promise<void> {
		const user = await this.authRepository.findByResetToken(token);
		if (!user) {
			throw new AuthServiceError("El enlace de restablecimiento no es válido.", 400);
		}
		if (user.reset_expires && user.reset_expires.getTime() < Date.now()) {
			throw new AuthServiceError(
				"El enlace de restablecimiento expiró. Solicita uno nuevo.",
				400,
			);
		}
		await this.authRepository.updatePassword(
			user.id,
			await bcrypt.hash(newPassword, 10),
		);
	}

	private buildAuthResponse(user: AuthUser): LoginResponse {
		const secret = process.env.JWT_SECRET?.trim();

		if (!secret) {
			throw new AuthServiceError("El servidor no está configurado correctamente.", 500);
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
