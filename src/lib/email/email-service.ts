import { env } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  const from = options.from || env.EMAIL_FROM;

  if (!env.RESEND_API_KEY || env.RESEND_API_KEY === "re_placeholder") {
    logger.info("[MockEmailDispatch]", {
      to: options.to,
      subject: options.subject,
      from,
      preview: options.text || options.html.slice(0, 100),
    });
    return { success: true, id: `mock-email-${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("Failed to send transactional email via Resend", { status: res.status, errorText });
      return { success: false };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (error) {
    logger.error("Error dispatching email", { error });
    return { success: false };
  }
}
