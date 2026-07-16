import { z } from "zod";

// Dominio simple (p. ej. envios.drlogistics.com), sin protocolo ni ruta.
const domainPattern = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;

export const CreateEmailDomainSchema = z.object({
  body: z.object({
    domain: z
      .string()
      .trim()
      .regex(domainPattern, {
        message: "Ingresa un dominio válido, p. ej. correo.tuempresa.com",
      }),
    agency_id: z.guid({ message: "Ingrese un ID de agencia válido" }),
  }),
});

export type CreateEmailDomainBody = z.infer<
  typeof CreateEmailDomainSchema
>["body"];
