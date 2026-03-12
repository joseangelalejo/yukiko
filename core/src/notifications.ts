import { db, adultRequests } from '../../db/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import type { Platform } from './types.js';

export async function checkAdultVerificationNotifications(
  platform: Platform,
  userId: string,
  displayName: string,
  sendNotification: (msg: string) => Promise<void>
): Promise<void> {
  try {
    const notifications = await db
      .select()
      .from(adultRequests)
      .where(
        and(
          eq(adultRequests.platformUserId, userId),
          eq(adultRequests.platform, platform),
          isNull(adultRequests.notifiedAt)
        )
      )
      .limit(1);

    if (!notifications.length) return;
    const req = notifications[0];
    if (req.status !== 'approved' && req.status !== 'rejected') return;

    if (req.status === 'approved') {
      await sendNotification(
        `✅ **Verificación +18 APROBADA** 🎉\n\n` +
        `¡Hola *${displayName}*! Tu solicitud de acceso a contenido +18 ha sido **aprobada**.\n\n` +
        `Ahora puedes disfrutar de comandos exclusivos. Úsalos con responsabilidad. 🌸`
      );
    } else {
      const reason = req.rejectionReason ? `\nRazón: ${req.rejectionReason}` : '';
      await sendNotification(
        `❌ **Verificación +18 RECHAZADA**\n\n` +
        `Tu solicitud de acceso a contenido +18 ha sido rechazada.${reason}\n\n` +
        `Puedes reintentar más tarde con **/verify18**.`
      );
    }

    await db
      .update(adultRequests)
      .set({ notifiedAt: new Date() })
      .where(eq(adultRequests.id, req.id));

  } catch (error) {
    console.error('Error checking adult verification notifications:', error);
  }
}
