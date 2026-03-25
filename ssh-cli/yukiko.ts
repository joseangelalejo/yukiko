#!/usr/bin/env node
/**
 * Yukiko SSH CLI — Remote administration tool
 * Usage: yukiko <command> [options]
 *
 * Commands:
 *   status              — Show bot platform status
 *   restart <platform>  — Restart a platform (discord|telegram|mobile|all)
 *   logs [--tail]       — Show recent logs
 *   users               — List recent users
 *   ban <userId>        — Ban a user
 *   backup              — Backup database
 *   deploy              — Pull latest changes and restart
 */

import { Command } from 'commander';
import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import 'dotenv/config';

const program = new Command();

program
  .name('yukiko')
  .description('🌨️ Yukiko Bot — CLI de administración remota')
  .version('1.0.0');

// ── Status ────────────────────────────────────────────────────
program
  .command('status')
  .description('Muestra el estado de todas las plataformas')
  .action(() => {
    console.log('\n🌨️ Yukiko Bot Status\n');
    const processes = ['yukiko-discord', 'yukiko-telegram', 'yukiko-mobile'];
    for (const proc of processes) {
      try {
        const result = execSync(`pgrep -f ${proc}`, { encoding: 'utf8' }).trim();
        const platform = proc.replace('yukiko-', '');
        console.log(`  ✅ ${platform.padEnd(10)} — Online (PID: ${result})`);
      } catch {
        const platform = proc.replace('yukiko-', '');
        console.log(`  ❌ ${platform.padEnd(10)} — Offline`);
      }
    }
    console.log();
  });

// ── Restart ───────────────────────────────────────────────────
program
  .command('restart [platform]')
  .description('Reinicia una plataforma del bot')
  .action((platform: string = 'all') => {
    const platforms = platform === 'all'
      ? ['discord', 'telegram', 'mobile']
      : [platform];

    for (const p of platforms) {
      console.log(`🔄 Reiniciando ${p}...`);
      try {
        execSync(`pm2 restart yukiko-${p}`, { stdio: 'inherit' });
        console.log(`  ✅ ${p} reiniciado`);
      } catch {
        console.log(`  ❌ Error al reiniciar ${p}. ¿Está configurado pm2?`);
      }
    }
  });

// ── Logs ──────────────────────────────────────────────────────
program
  .command('logs [platform]')
  .description('Muestra logs del bot')
  .option('--tail', 'Seguir logs en tiempo real')
  .option('-n, --lines <n>', 'Número de líneas', '50')
  .action((platform: string = 'all', opts) => {
    const target = platform === 'all' ? 'yukiko' : `yukiko-${platform}`;
    const args = opts.tail
      ? ['logs', target, '--lines', opts.lines]
      : ['logs', target, '--lines', opts.lines, '--nostream'];

    spawn('pm2', args, { stdio: 'inherit' });
  });

// ── Users ─────────────────────────────────────────────────────
program
  .command('users')
  .description('Lista usuarios recientes')
  .option('-n, --limit <n>', 'Número de usuarios', '20')
  .action(async (opts) => {
    console.log('\n👥 Usuarios recientes:\n');
    const res = await fetch(`${process.env.APP_URL}/api/admin/users?limit=${opts.limit}`, {
      headers: { Authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    }).catch(() => null);

    if (!res?.ok) {
      console.log('  ❌ No se pudo conectar al API. ¿Está la web corriendo?');
      return;
    }

    const users = await res.json() as Array<{ displayName: string; platform: string; balance: number; level: number }>;
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.displayName.padEnd(20)} [${u.platform}] 🪙${u.balance} Lv.${u.level}`);
    });
    console.log();
  });

// ── Ban ───────────────────────────────────────────────────────
program
  .command('ban <userId>')
  .description('Banea a un usuario por ID')
  .option('-r, --reason <reason>', 'Motivo del ban', 'Ban via CLI')
  .action(async (userId: string, opts) => {
    console.log(`🔨 Baneando usuario ${userId}...`);
    const res = await fetch(`${process.env.APP_URL}/api/admin/ban`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_SECRET}`,
      },
      body: JSON.stringify({ userId, reason: opts.reason }),
    }).catch(() => null);

    if (res?.ok) {
      console.log(`  ✅ Usuario ${userId} baneado. Motivo: ${opts.reason}`);
    } else {
      console.log('  ❌ Error al banear usuario');
    }
  });

// ── Backup ────────────────────────────────────────────────────
program
  .command('backup')
  .description('Hace backup de la base de datos')
  .action(async () => {
    const filename = `yukiko-backup-${new Date().toISOString().split('T')[0]}.sql`;
    console.log(`💾 Generando backup: ${filename}...`);

    try {
      const dbUrl = process.env.DATABASE_URL ?? '';
      execSync(`pg_dump "${dbUrl}" > ./backups/${filename}`, { stdio: 'inherit' });
      console.log(`  ✅ Backup guardado en ./backups/${filename}`);
    } catch {
      console.log('  ❌ Error al generar backup. ¿Está pg_dump instalado?');
    }
  });

// ── Deploy ────────────────────────────────────────────────────
program
  .command('deploy')
  .description('Pull + build + restart (deploy completo)')
  .action(() => {
    console.log('🚀 Iniciando deploy...\n');

    const steps = [
      ['git pull origin main', 'Git pull'],
      ['npm install', 'Instalando dependencias'],
      ['npm run build:bots', 'Compilando bots'],
      ['pm2 restart all', 'Reiniciando procesos'],
    ];

    for (const [cmd, label] of steps) {
      console.log(`  ⏳ ${label}...`);
      try {
        execSync(cmd, { stdio: 'pipe' });
        console.log(`  ✅ ${label} completado`);
      } catch (err) {
        console.log(`  ❌ Error en: ${label}`);
        process.exit(1);
      }
    }

    console.log('\n✨ Deploy completado con éxito!');
  });

program.parse();
