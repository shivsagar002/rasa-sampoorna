type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

class Logger {
  private isProd = process.env.NODE_ENV === "production";

  private redact(obj: unknown): unknown {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.redact(item));

    const sensitiveKeys = [
      "password",
      "passwordhash",
      "token",
      "secret",
      "authorization",
      "cookie",
      "key",
      "cvv",
      "razorpaysignature",
    ];

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        result[k] = "[REDACTED]";
      } else if (typeof v === "object") {
        result[k] = this.redact(v);
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context: this.redact(context) as Record<string, unknown> } : {}),
    };

    if (this.isProd) {
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        JSON.stringify(payload)
      );
    } else {
      const timeStr = new Date().toLocaleTimeString();
      const prefix = `[${timeStr}] [${level.toUpperCase()}]`;
      if (level === "error") {
        console.error(prefix, message, context || "");
      } else if (level === "warn") {
        console.warn(prefix, message, context || "");
      } else {
        console.log(prefix, message, context || "");
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.isProd) this.write("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.write("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.write("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.write("error", message, context);
  }
}

export const logger = new Logger();
