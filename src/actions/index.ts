import { defineAction, ActionError } from "astro:actions";
import { Resend } from "resend";
import { z } from "astro:schema";

const resend = new Resend(import.meta.env.PUBLIC_RESEND_KEY);

// Función para crear el template HTML profesional
function createEmailTemplate(name, email, subject, message) {
  const currentDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuevo mensaje de contacto - MundonlineBooks</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8fafc;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          font-size: 24px;
          margin-bottom: 10px;
          font-weight: 700;
        }
        .header p {
          font-size: 16px;
          opacity: 0.9;
        }
        .logo {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 15px;
        }
        .content {
          padding: 30px;
        }
        .info-card {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 25px;
          color: white;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .info-item {
          background: rgba(255, 255, 255, 0.15);
          padding: 15px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }
        .info-item label {
          display: block;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 5px;
          opacity: 0.8;
        }
        .info-item span {
          font-size: 16px;
          font-weight: 500;
        }
        .message-section {
          background: #f8fafc;
          border-radius: 10px;
          padding: 25px;
          border-left: 4px solid #667eea;
          margin: 20px 0;
        }
        .message-section h3 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 18px;
          display: flex;
          align-items: center;
        }
        .message-section h3::before {
          content: "💬";
          margin-right: 8px;
        }
        .message-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          font-size: 15px;
          line-height: 1.7;
          color: #4a5568;
          border: 1px solid #e2e8f0;
        }
        .metadata {
          background: #edf2f7;
          padding: 20px;
          border-radius: 8px;
          font-size: 13px;
          color: #718096;
          text-align: center;
          margin-top: 25px;
        }
        .metadata strong {
          color: #4a5568;
        }
        .footer {
          background: #2d3748;
          color: #a0aec0;
          padding: 25px;
          text-align: center;
          font-size: 14px;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
        .footer a:hover {
          text-decoration: underline;
        }
        .priority-badge {
          display: inline-block;
          background: #f56565;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-left: 10px;
        }
        .contact-info {
          display: flex;
          justify-content: space-around;
          margin-top: 15px;
          flex-wrap: wrap;
        }
        .contact-item {
          text-align: center;
          margin: 5px;
        }
        .contact-item span {
          display: block;
          font-size: 12px;
          opacity: 0.7;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .info-grid {
            grid-template-columns: 1fr;
          }
          .contact-info {
            flex-direction: column;
            align-items: center;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="logo">📚</div>
          <h1>MundonlineBooks</h1>
          <p>Nuevo mensaje de contacto recibido</p>
        </div>

        <!-- Content -->
        <div class="content">
          <!-- Contact Info Card -->
          <div class="info-card">
            <div class="info-grid">
              <div class="info-item">
                <label>👤 Nombre</label>
                <span>${name}</span>
              </div>
              <div class="info-item">
                <label>📧 Email</label>
                <span>${email}</span>
              </div>
            </div>
            
            ${
              subject && subject !== "general"
                ? `
              <div class="info-item">
                <label>📋 Asunto</label>
                <span>${getSubjectLabel(subject)}</span>
                ${subject === "technical" ? '<span class="priority-badge">Prioridad</span>' : ""}
              </div>
            `
                : ""
            }
          </div>

          <!-- Message Section -->
          <div class="message-section">
            <h3>Mensaje del cliente</h3>
            <div class="message-content">
              ${message.replace(/\n/g, "<br>")}
            </div>
          </div>

          <!-- Metadata -->
          <div class="metadata">
            <strong>📅 Fecha de recepción:</strong> ${currentDate}<br>
            <strong>🌐 Origen:</strong> Formulario de contacto web<br>
            <strong>📱 Estado:</strong> Pendiente de respuesta
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>MundonlineBooks</strong> - Tu biblioteca digital de confianza</p>
          
          <div class="contact-info">
            <div class="contact-item">
              <strong>📧</strong>
              <span>Email</span>
            </div>
            <div class="contact-item">
              <strong>💬</strong>
              <span>Chat en vivo</span>
            </div>
            <div class="contact-item">
              <strong>📞</strong>
              <span>Soporte</span>
            </div>
          </div>
          
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
            Este mensaje fue enviado desde el formulario de contacto de 
            <a href="https://mundonlinebooks.vercel.app">mundonlinebooks.vercel.app</a>
          </p>
          
          <p style="margin-top: 10px; font-size: 11px; opacity: 0.5;">
            © 2025 MundonlineBooks. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Función para convertir el código del asunto en texto legible
function getSubjectLabel(subject) {
  const subjects = {
    general: "Consulta general",
    technical: "Soporte técnico",
    billing: "Facturación y pagos",
    account: "Problemas con la cuenta",
    download: "Problemas de descarga",
    suggestion: "Sugerencia o feedback",
    partnership: "Colaboraciones",
    other: "Otro tema",
  };
  return subjects[subject] || "Consulta general";
}

export const server = {
  sendMailContact: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
      email: z.string().email("Dirección de email inválida"),
      subject: z.string().optional(),
      message: z
        .string()
        .min(20, "El mensaje debe tener al menos 20 caracteres"),
    }),
    handler: async (input) => {
      try {
        // Crear el template HTML profesional
        const htmlTemplate = createEmailTemplate(
          input.name,
          input.email,
          input.subject,
          input.message
        );

        // Determinar la prioridad basada en el asunto
        const isPriority =
          input.subject === "technical" || input.subject === "billing";
        const subjectPrefix = isPriority ? "[PRIORITARIO] " : "";
        const subjectLabel = input.subject
          ? getSubjectLabel(input.subject)
          : "Consulta general";

        const { data, error } = await resend.emails.send({
          from: "MundonlineBooks <contacto@mundonlinebooks.com>",
          to: ["juanppdev@gmail.com"],
          replyTo: input.email,
          subject: `${subjectPrefix}${subjectLabel} - ${input.name}`,
          html: htmlTemplate,
          // También enviar versión texto plano como fallback
          text: `
Nuevo mensaje de contacto - MundonlineBooks

Nombre: ${input.name}
Email: ${input.email}
Asunto: ${subjectLabel}

Mensaje:
${input.message}

---
Enviado desde el formulario de contacto de MundonlineBooks
Fecha: ${new Date().toLocaleString("es-ES")}
          `.trim(),
        });

        if (error) {
          console.error("Error enviando email:", error);
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error al enviar el mensaje. Por favor, intenta de nuevo.",
          });
        }

        // Log exitoso (opcional)
        console.log("Email enviado exitosamente:", {
          to: input.email,
          subject: subjectLabel,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          message: "Mensaje enviado correctamente. Te responderemos pronto.",
          data,
        };
      } catch (err) {
        console.error("Error en sendMailContact:", err);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error interno del servidor. Por favor, intenta más tarde.",
        });
      }
    },
  }),
};
