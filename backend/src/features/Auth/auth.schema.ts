import { z } from "zod";

export const LoginSchema = z.object({
	body: z.object({
		email: z.email("Formato de email invalido."),
		password: z.string().min(1, "La contraseña es requerida."),
	}),
});

export type LoginBody = z.infer<typeof LoginSchema>["body"];
