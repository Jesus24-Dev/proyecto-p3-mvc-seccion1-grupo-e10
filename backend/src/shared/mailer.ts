// Envío de correos. Usa Resend si RESEND_API_KEY está definido; si no, "simula"
// el envío registrándolo en consola (útil en desarrollo sin credenciales).
//
// Variables de entorno:
//   RESEND_API_KEY  Clave de API de Resend (si falta, se simula el envío).
//   RESEND_FROM     Remitente, p. ej. "Dr Logistics <no-reply@tudominio.com>".

const BRAND = "Dr Logistics";
const RED = "#e0564f"; // Acento de la marca (ver LoginPage).

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type EmailResult = {
  sent: boolean;
  simulated: boolean;
};

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() || `${BRAND} <onboarding@resend.dev>`;

  if (!apiKey) {
    // Sin clave: registro simulado para desarrollo.
    console.log(
      `[mailer] (simulado) → ${input.to} · "${input.subject}"\n` +
        `[mailer] define RESEND_API_KEY para enviar de verdad.`,
    );
    return { sent: true, simulated: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error(`[mailer] Resend respondió ${response.status}: ${detail}`);
      return { sent: false, simulated: false };
    }
    return { sent: true, simulated: false };
  } catch (error) {
    console.error("[mailer] Error enviando con Resend:", error);
    return { sent: false, simulated: false };
  }
}

// Plantilla base: contenedor centrado, tipografía de sistema, botón de acción.
function layout(options: {
  heading: string;
  intro: string;
  buttonLabel: string;
  buttonUrl: string;
  footnote: string;
}): string {
  const { heading, intro, buttonLabel, buttonUrl, footnote } = options;
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#0b0b0f;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#16161c;border:1px solid #26262f;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:28px 32px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="width:40px;height:40px;background:${RED};border-radius:10px;text-align:center;vertical-align:middle;font-size:20px;">📦</td>
              <td style="padding-left:12px;font-size:18px;font-weight:700;color:#ffffff;">${BRAND}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:16px 32px 0;">
            <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:#ffffff;">${heading}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a1a1ad;">${intro}</p>
          </td></tr>
          <tr><td style="padding:0 32px 8px;">
            <a href="${buttonUrl}" style="display:block;background:${RED};color:#ffffff;text-decoration:none;text-align:center;font-weight:600;font-size:15px;padding:14px 20px;border-radius:999px;">${buttonLabel}</a>
          </td></tr>
          <tr><td style="padding:16px 32px 4px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6f7b;">O copia y pega este enlace en tu navegador:</p>
            <p style="margin:4px 0 0;font-size:12px;line-height:1.6;word-break:break-all;"><a href="${buttonUrl}" style="color:${RED};">${buttonUrl}</a></p>
          </td></tr>
          <tr><td style="padding:24px 32px 28px;border-top:1px solid #26262f;margin-top:16px;">
            <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6f6f7b;">${footnote}</p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#54545e;">© ${BRAND} · Panel de operaciones</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function magicLinkEmail(url: string): { subject: string; html: string } {
  return {
    subject: `Tu enlace para entrar a ${BRAND}`,
    html: layout({
      heading: "Inicia sesión sin contraseña",
      intro:
        "Toca el botón para entrar a tu panel de operaciones. El enlace caduca en 15 minutos y solo puede usarse una vez.",
      buttonLabel: "Entrar a mi cuenta",
      buttonUrl: url,
      footnote:
        "Si no solicitaste este enlace, puedes ignorar este correo; tu cuenta sigue segura.",
    }),
  };
}

export function resetPasswordEmail(url: string): {
  subject: string;
  html: string;
} {
  return {
    subject: `Restablece tu contraseña de ${BRAND}`,
    html: layout({
      heading: "Restablece tu contraseña",
      intro:
        "Recibimos una solicitud para cambiar tu contraseña. Toca el botón para elegir una nueva. El enlace caduca en 1 hora.",
      buttonLabel: "Crear nueva contraseña",
      buttonUrl: url,
      footnote:
        "Si no solicitaste este cambio, ignora este correo y tu contraseña actual seguirá funcionando.",
    }),
  };
}

export function verificationEmail(url: string): {
  subject: string;
  html: string;
} {
  return {
    subject: `Verifica tu correo en ${BRAND}`,
    html: layout({
      heading: "Confirma tu correo",
      intro:
        "¡Bienvenido! Confirma tu dirección de correo para activar tu cuenta y empezar a operar.",
      buttonLabel: "Verificar mi correo",
      buttonUrl: url,
      footnote:
        "Si no creaste esta cuenta, puedes ignorar este correo sin problema.",
    }),
  };
}
