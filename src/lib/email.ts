import { Resend } from 'resend';

// En caso de no haber un token aún, evitar crashear enviando un log simulado.
const resendToken = process.env.RESEND_API_KEY;
const resend = resendToken ? new Resend(resendToken) : null;

export async function sendAdminNotification({
  actionType,
  details,
  adminEmail,
}: {
  actionType: string;
  details: string;
  adminEmail?: string;
}) {
  const destinatario = adminEmail || process.env.ADMIN_EMAIL || 'admin@araure-tricentenaria.com';

  if (!resend) {
    console.warn('⚠️ [EMAIL SYSTEM] Modo de depuración activado. No se encontró RESEND_API_KEY.');
    console.log(`✉️ Correo interceptado para [${destinatario}]:`);
    console.log(`   Asunto: Nueva actividad en la Comuna: ${actionType}`);
    console.log(`   Cuerpo: ${details}`);
    return { success: true, fake: true };
  }

  try {
    const data = await resend.emails.send({
      from: 'Araure Tricentenaria <onboarding@resend.dev>', // Por resend.dev para pruebas gratuitas
      to: [destinatario],
      subject: `Notificación del Censo: ${actionType}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Sistema de Censo Comunal</h2>
          <p><strong>Araure Tricentenaria</strong></p>
          <hr />
          <h3>Se requiere tu atención: ${actionType}</h3>
          <p>${details}</p>
          <br />
          <p><em>Este es un correo automático, por favor no lo respondas directamente. Para más detalles, accede al Panel de Administración.</em></p>
        </div>
      `,
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('Error al enviar email via Resend:', error);
    return { success: false, error };
  }
}
