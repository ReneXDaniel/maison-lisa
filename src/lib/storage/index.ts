import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db } from "@/db";
import { storageObjects } from "@/db/schema";

/**
 * Private object storage. Nothing stored here is ever reachable by a public
 * URL: every read goes through an authorising route handler, which either
 * streams the bytes (local driver) or issues a short-lived presigned URL (S3).
 */
export interface StorageDriver {
  readonly name: "local" | "s3" | "db";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  presignedGet?(key: string, ttlSeconds: number, fileName: string, inline: boolean): Promise<string>;
}

const KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,300}$/;

export function assertSafeKey(key: string) {
  if (!KEY_RE.test(key) || key.includes("..") || key.includes("//")) throw new Error(`Unsafe storage key: ${key}`);
}

class LocalStorage implements StorageDriver {
  readonly name = "local" as const;
  private root = path.resolve(env().STORAGE_LOCAL_DIR);
  private resolve(key: string) {
    assertSafeKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Path traversal blocked");
    return full;
  }
  async put(key: string, body: Buffer) {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body, { mode: 0o600 });
  }
  async get(key: string) {
    try {
      return await fs.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

class S3Storage implements StorageDriver {
  readonly name = "s3" as const;
  private client: S3Client;
  private bucket: string;
  constructor() {
    const e = env();
    if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY) throw new Error("S3 storage selected but S3_* variables are incomplete");
    this.bucket = e.S3_BUCKET;
    this.client = new S3Client({
      region: e.S3_REGION ?? "auto",
      endpoint: e.S3_ENDPOINT || undefined,
      forcePathStyle: !!e.S3_ENDPOINT,
      credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY },
    });
  }
  async put(key: string, body: Buffer, contentType: string) {
    assertSafeKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }
  async get(key: string) {
    assertSafeKey(key);
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
  async presignedGet(key: string, ttlSeconds: number, fileName: string, inline: boolean) {
    assertSafeKey(key);
    const disposition = `${inline ? "inline" : "attachment"}; filename="${fileName.replace(/[^\w.\- ]/g, "_")}"`;
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: disposition }), {
      expiresIn: ttlSeconds,
    });
  }
}

/**
 * Stores objects in PostgreSQL (table storage_objects). For preview
 * deployments on hosts whose disk is wiped on every restart; files then
 * survive as long as the database does. Production should use S3.
 */
class DbStorage implements StorageDriver {
  readonly name = "db" as const;
  async put(key: string, body: Buffer, contentType: string) {
    assertSafeKey(key);
    await db
      .insert(storageObjects)
      .values({ key, content: body, contentType, size: body.length })
      .onConflictDoUpdate({ target: storageObjects.key, set: { content: body, contentType, size: body.length } });
  }
  async get(key: string) {
    assertSafeKey(key);
    const [row] = await db.select({ content: storageObjects.content }).from(storageObjects).where(eq(storageObjects.key, key));
    return row ? Buffer.from(row.content) : null;
  }
  async delete(key: string) {
    assertSafeKey(key);
    await db.delete(storageObjects).where(eq(storageObjects.key, key));
  }
}

const g = globalThis as unknown as { __mlStorage?: StorageDriver };

export function storage(): StorageDriver {
  if (!g.__mlStorage) {
    const driver = env().STORAGE_DRIVER;
    g.__mlStorage = driver === "s3" ? new S3Storage() : driver === "db" ? new DbStorage() : new LocalStorage();
  }
  return g.__mlStorage;
}
