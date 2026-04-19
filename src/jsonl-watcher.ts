import * as fs from 'node:fs';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';
import { parseJsonlContent } from './jsonl-parser';
import type { ParsedMessage } from './types';

/** A session is "active" if its JSONL file was written within this window. */
const ACTIVE_THRESHOLD_MS = 5 * 60_000;

export interface WatcherEvents {
  data: [messages: ParsedMessage[], isLive: boolean];
  error: [error: Error];
}

/** Watches ~/.claude/projects/ for JSONL changes, parses incrementally */
export class JsonlWatcher extends EventEmitter {
  private watchers: fs.FSWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private fileOffsets = new Map<string, number>();
  private allMessages: ParsedMessage[] = [];
  private readonly debounceMs: number;

  constructor(
    private readonly basePath: string,
    debounceMs = 2000,
  ) {
    super();
    this.debounceMs = debounceMs;
  }

  /** Start watching all JSONL files */
  start(): void {
    if (!fs.existsSync(this.basePath)) {
      this.emit('error', new Error(`JSONL path not found: ${this.basePath}`));
      return;
    }

    // Initial scan of all project directories
    this.scanAndParse();

    // Watch base directory for new project folders
    try {
      const baseWatcher = fs.watch(this.basePath, { recursive: true }, (_event, filename) => {
        if (!filename || !filename.endsWith('.jsonl')) return;
        // Skip subagent files — they reuse parent sessionId and inflate counts
        if (filename.includes(`${path.sep}subagents${path.sep}`) || filename.includes('/subagents/')) return;
        const fullPath = path.join(this.basePath, filename);
        this.debounceParse(fullPath);
      });
      this.watchers.push(baseWatcher);
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /** Stop all watchers */
  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /** Get all currently parsed messages */
  getMessages(): ParsedMessage[] {
    return this.allMessages;
  }

  /**
   * Check if any session is currently active (file modified < 5 min ago).
   * 5min matches Anthropic's session window concept — long enough to survive
   * normal user think-time pauses but short enough to drop truly idle sessions.
   */
  isAnySessionActive(): boolean {
    try {
      return this.findJsonlFiles().some((filePath) => {
        const stat = fs.statSync(filePath);
        return Date.now() - stat.mtimeMs < ACTIVE_THRESHOLD_MS;
      });
    } catch {
      return false;
    }
  }

  /** Returns map of sessionId → project name derived from directory structure */
  getSessionProjectMap(): Record<string, string> {
    const map: Record<string, string> = {};
    try {
      const dirs = fs.readdirSync(this.basePath);
      for (const dir of dirs) {
        const dirPath = path.join(this.basePath, dir);
        try {
          const stat = fs.statSync(dirPath);
          if (!stat.isDirectory()) continue;

          // Decode percent-encoded dir name (e.g. -Users-foo-myproject → myproject)
          const decoded = dir.replace(/%([0-9A-Fa-f]{2})/g, (_, h) =>
            String.fromCharCode(parseInt(h, 16)),
          );
          // Use last path segment as project name
          const projectName = decoded.split('-').filter(Boolean).pop() ?? dir;

          const dirFiles = fs.readdirSync(dirPath);
          for (const file of dirFiles) {
            if (file.endsWith('.jsonl')) {
              const sessionId = path.basename(file, '.jsonl');
              map[sessionId] = projectName;
            }
          }
        } catch {
          // skip unreadable dirs
        }
      }
    } catch {
      // basePath unreadable
    }
    return map;
  }

  /** Returns set of session IDs whose JSONL file was written within ACTIVE_THRESHOLD_MS. */
  getActiveSessions(): Set<string> {
    const active = new Set<string>();
    try {
      const files = this.findJsonlFiles();
      for (const filePath of files) {
        try {
          const stat = fs.statSync(filePath);
          if (Date.now() - stat.mtimeMs < ACTIVE_THRESHOLD_MS) {
            active.add(path.basename(filePath, '.jsonl'));
          }
        } catch {
          // skip
        }
      }
    } catch {
      // ignore
    }
    return active;
  }

  /** Scan all JSONL files and parse them */
  private scanAndParse(): void {
    const files = this.findJsonlFiles();
    this.allMessages = [];

    for (const filePath of files) {
      this.parseFile(filePath);
    }

    this.emit('data', this.allMessages, this.isAnySessionActive());
  }

  /** Find all .jsonl files recursively (2 levels deep: basePath/{dir}/*.jsonl) */
  private findJsonlFiles(): string[] {
    const files: string[] = [];
    try {
      const dirs = fs.readdirSync(this.basePath);
      for (const dir of dirs) {
        const dirPath = path.join(this.basePath, dir);
        const stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) continue;

        const dirFiles = fs.readdirSync(dirPath);
        for (const file of dirFiles) {
          if (file.endsWith('.jsonl')) {
            files.push(path.join(dirPath, file));
          }
        }
      }
    } catch {
      // Directory read failed — return empty
    }
    return files;
  }

  /** Debounce parse for a specific file */
  private debounceParse(filePath: string): void {
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(filePath, setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.parseFileIncremental(filePath);
      this.emit('data', this.allMessages, this.isAnySessionActive());
    }, this.debounceMs));
  }

  /** Parse a file from scratch */
  private parseFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sessionId = path.basename(filePath, '.jsonl');
      const messages = parseJsonlContent(content, sessionId);

      // Remove old messages from this file, add new ones
      this.allMessages = this.allMessages.filter((m) => m.sessionId !== sessionId);
      this.allMessages.push(...messages);

      this.fileOffsets.set(filePath, Buffer.byteLength(content, 'utf-8'));
    } catch {
      // File read failed — skip
    }
  }

  /** Parse only new content from a file (incremental) */
  private parseFileIncremental(filePath: string): void {
    try {
      const stat = fs.statSync(filePath);
      const previousOffset = this.fileOffsets.get(filePath) ?? 0;

      if (stat.size <= previousOffset) {
        // File hasn't grown — might have been truncated, re-parse fully
        if (stat.size < previousOffset) {
          this.parseFile(filePath);
        }
        return;
      }

      // Read only new bytes with fd safety
      let fd: number | undefined;
      try {
        fd = fs.openSync(filePath, 'r');
        const newBytes = stat.size - previousOffset;
        const buffer = Buffer.alloc(newBytes);
        fs.readSync(fd, buffer, 0, newBytes, previousOffset);

        let newContent = buffer.toString('utf-8');
        // Handle potential UTF-8 boundary split: if first char is a continuation byte,
        // skip to the first newline to avoid corrupting a JSON line
        if (newContent.length > 0 && newContent.charCodeAt(0) === 0xFFFD) {
          const nlIndex = newContent.indexOf('\n');
          if (nlIndex >= 0) {
            newContent = newContent.slice(nlIndex + 1);
          } else {
            newContent = '';
          }
        }

        const sessionId = path.basename(filePath, '.jsonl');
        const newMessages = parseJsonlContent(newContent, sessionId);

        this.allMessages.push(...newMessages);
        this.fileOffsets.set(filePath, stat.size);
      } finally {
        if (fd !== undefined) fs.closeSync(fd);
      }
    } catch {
      // Incremental read failed — fall back to full parse
      this.parseFile(filePath);
    }
  }
}
