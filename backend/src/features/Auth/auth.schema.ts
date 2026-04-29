import { z } from "zod";

export const LoginSchema = z.object({
	body: z.object({
		email: z.email("Formato de email invalido."),
		password: z.string().min(1, "La contraseña es requerida."),
	}),
});

export const RegisterSchema = z.object({
	body: z.object({
		email: z.email("Formato de email invalido."),
		password: z.string().regex(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/, {
			message:
				"La contraseña debe tener al menos 8 caracteres, una mayúscula y un número",
		}),
	}),
});

export type LoginBody = z.infer<typeof LoginSchema>["body"];
export type RegisterBody = z.infer<typeof RegisterSchema>["body"];
