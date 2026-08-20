// This file is the single source of truth for the runtime global types used
// by this Worker (Response, Request, Headers, URL, crypto, D1Database, ...).
// It is referenced from tsconfig.json via the "types" compiler option.
//
// Do NOT add the "DOM" or "WebWorker" libs to tsconfig.json and do NOT
// install @cloudflare/workers-types: their global declarations would
// conflict with the ones in this file (duplicate identifier errors).
// Keep any runtime type updates in this file so it stays the only source.

interface Env {
  DB: D1Database;
  SETUP_TOKEN?: string;
}

declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

// Cloudflare Workers Runtime Types
declare class Response {
  constructor(body?: string | ArrayBuffer | null, init?: ResponseInit);
  readonly headers: Headers;
  readonly status: number;
  readonly ok: boolean;
  json(): Promise<any>;
  text(): Promise<string>;
}

interface ResponseInit {
  status?: number;
  headers?: Record<string, string> | Headers;
}

declare class Request {
  constructor(input: string | Request, init?: RequestInit);
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  json(): Promise<any>;
}

interface RequestInit {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: string;
}

declare class Headers {
  constructor(init?: Record<string, string>);
  get(name: string): string | null;
  set(name: string, value: string): void;
  forEach(callbackfn: (value: string, key: string) => void): void;
}

declare class URL {
  constructor(url: string, base?: string);
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
  readonly href: string;
}

declare class URLSearchParams {
  get(name: string): string | null;
}

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

declare class TextDecoder {
  decode(input?: Uint8Array): string;
}

declare const crypto: {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
};

declare interface SubtleCrypto {
  digest(algorithm: string | Algorithm, data: BufferSource): Promise<ArrayBuffer>;
  importKey(
    format: string,
    keyData: BufferSource,
    algorithm: string | Algorithm,
    extractable: boolean,
    keyUsages: string[]
  ): Promise<CryptoKey>;
  encrypt(algorithm: any, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
  decrypt(algorithm: any, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
  sign(algorithm: string | Algorithm, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
}

declare class CryptoKey {
  readonly type: string;
  readonly extractable: boolean;
  readonly algorithm: { name: string };
  readonly usages: string[];
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): Promise<void>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(col?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Result<T = unknown> {
  results: T[];
  meta: { changes: number };
}

interface ExportedHandler<E = unknown> {
  fetch(request: Request, env: E, ctx: ExecutionContext): Promise<Response>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}
