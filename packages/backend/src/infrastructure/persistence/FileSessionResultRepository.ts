import * as fs from 'fs/promises';
import * as path from 'path';
import type { SessionResult, ISessionResultRepository } from '@planning-poker/shared';

export class FileSessionResultRepository implements ISessionResultRepository {
  constructor(private readonly dataDir: string) {}

  private filePath(sessionId: string): string {
    return path.join(this.dataDir, `${sessionId}.json`);
  }

  async save(result: SessionResult): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.writeFile(this.filePath(result.sessionId), JSON.stringify(result, null, 2), 'utf-8');
  }

  async findAll(): Promise<SessionResult[]> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      const results = await Promise.all(
        jsonFiles.map(async (file) => {
          const content = await fs.readFile(path.join(this.dataDir, file), 'utf-8');
          return JSON.parse(content) as SessionResult;
        })
      );
      return results.sort((a, b) => a.startedAt - b.startedAt);
    } catch {
      return [];
    }
  }

  async findById(sessionId: string): Promise<SessionResult | undefined> {
    try {
      const content = await fs.readFile(this.filePath(sessionId), 'utf-8');
      return JSON.parse(content) as SessionResult;
    } catch {
      return undefined;
    }
  }
}
