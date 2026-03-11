import { promises as fs } from 'node:fs';
import type { FileProvider } from './types.js';

export class NodeFileProvider implements FileProvider {
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export class MemoryFileProvider implements FileProvider {
  private readonly files = new Map<string, string>();

  constructor(files: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(files)) {
      this.files.set(path, content);
    }
  }

  setFile(filePath: string, content: string): void {
    this.files.set(filePath, content);
  }

  async readFile(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found in MemoryFileProvider: ${filePath}`);
    }

    return content;
  }

  async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }
}
