import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

function safe(o: unknown) {
  try { return JSON.stringify(o); } catch { return "[unserializable]"; }
}

export const reqId = () => randomUUID();

export function newReqId() {
  return randomUUID();
}

export function log(level: LogLevel, msg: string, ctx?: Record<string, unknown>) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}${ctx ? " :: " + safe(ctx) : ""}`;
  // eslint-disable-next-line no-console
  (console as any)[level === "debug" ? "log" : level](line);
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => log("debug", m, c),
  info:  (m: string, c?: Record<string, unknown>) => log("info",  m, c),
  warn:  (m: string, c?: Record<string, unknown>) => log("warn",  m, c),
  error: (m: string, c?: Record<string, unknown>) => log("error", m, c),
};
