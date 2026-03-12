import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Yukiko',
  description: 'Multi-platform bot — Discord, Telegram & WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main className="w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
