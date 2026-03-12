import type { Command, Platform } from './types.js';

class CommandRegistry {
  private commands = new Map<string, Command>();
  private aliases = new Map<string, string>();

  register(command: Command): void {
    this.commands.set(command.name, command);
    command.aliases?.forEach(alias => {
      this.aliases.set(alias, command.name);
    });
  }

  get(name: string): Command | undefined {
    const resolved = this.aliases.get(name) ?? name;
    return this.commands.get(resolved);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  getByCategory(category: string): Command[] {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  getForPlatform(platform: Platform): Command[] {
    return this.getAll().filter(cmd => cmd.platforms.includes(platform));
  }
}

export const registry = new CommandRegistry();
