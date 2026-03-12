import { db, adultRequests, users } from '../../db/index.js';
import { eq, and, gt } from 'drizzle-orm';
import type { Platform } from './types.js';

const lastCheckedTimestamp = new Map<Platform, Date>();

/**
 * Chequea si hay notificaciones pendientes de aprobación/rechazo de +18
 * Retorna la notificación para enviar al usuario
 */
export async function checkAdultVerificationNotifications(
  platform: Platform,
  userId: string,
  displayName: string,
  sendNotification: (msg: string) => Promise<void>
): Promise<void> {
  try {
    const lastChecked = lastCheckedTimestamp.get(platform) ?? new Date(Date.now() - 60000);
    const now = new Date();

    // Buscar requests de este usuario que hayan sido revisados desde el último check
    const notifications = await db
      .select()
      .from(adultRequests)
      .where(
        and(
          eq(adultRequests.platformUserId, userId),
          eq(adultRequests.platform, platform),
          // Solo mostrar si fue revisado recientemente
          gt(adultRequests.reviewedAt, lastChecked)
        )
      )
      .limit(1);

    lastCheckedTimestamp.set(platform, now);

    if (!notifications.length) return;

    const req = notifications[0];

    if (req.status === 'approved') {
      await sendNotification(
        `✅ **Verificación +18 APROBADA** 🎉\n\n` +
        `¡Hola *${displayName}*! Tu solicitud de acceso a contenido +18 ha sido **aprobada**.\n\n` +
        `Ahora puedes disfrutar de comandos exclusivos. Úsalos con responsabilidad. 🌸`
      );
    } else if (req.status === 'rejected') {
      const reason = req.rejectionReason ? `\nRazón: ${req.rejectionReason}` : '';
      await sendNotification(
        `❌ **Verificación +18 RECHAZADA**\n\n` +
        `Tu solicitud de acceso a contenido +18 ha sido rechazada.${reason}\n\n` +
        `Puedes reintentar más tarde con **/verify18**.`
      );
    }
  } catch (error) {
    console.error(`Error checking adult verification notifications:`, error);
  }
}
