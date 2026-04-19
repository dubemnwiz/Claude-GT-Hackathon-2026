import "dotenv/config";
import { readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { IMessageSDK, isImageAttachment, downloadAttachment } from "@photon-ai/imessage-kit";

const ALLOWED_NUMBER = process.env.ALLOWED_NUMBER ?? "+14043535586";
const AGENT_URL = process.env.AGENT_URL ?? process.env.RAILWAY_URL ?? "http://localhost:3000";

const sdk = new IMessageSDK({ debug: true });

async function handleMessage(text: string, sender: string, attachments: Awaited<ReturnType<typeof sdk.getMessages>>["messages"][0]["attachments"]) {
  try {
    const images: string[] = [];

    for (const att of attachments ?? []) {
      if (isImageAttachment(att)) {
        const tmpPath = join(tmpdir(), `fieldcoach_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
        try {
          await downloadAttachment(att, tmpPath);
          const b64 = readFileSync(tmpPath).toString("base64");
          images.push(`data:image/jpeg;base64,${b64}`);
          try { unlinkSync(tmpPath); } catch {}
        } catch (e) {
          console.error("[attachment] failed to read image:", e);
        }
      }
    }

    const payload = { from: sender, body: text, images };
    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    const started = Date.now();
    console.log(
      `[agent] POST ${AGENT_URL}/simulate/sms images=${images.length} json≈${Math.round(payloadBytes / 1024)}KB`,
    );

    const response = await fetch(`${AGENT_URL}/simulate/sms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(180_000),
    });

    const ms = Date.now() - started;
    const raw = await response.text();
    let data: { replyText?: string; ok?: boolean } = {};
    try {
      data = JSON.parse(raw) as { replyText?: string; ok?: boolean };
    } catch {
      console.error(`[agent] non-JSON response (${response.status}) after ${ms}ms:`, raw.slice(0, 500));
      return;
    }

    if (!response.ok) {
      console.error(`[agent] HTTP ${response.status} after ${ms}ms:`, raw.slice(0, 500));
      return;
    }

    if (!data.replyText?.trim()) {
      console.error(`[agent] empty replyText after ${ms}ms`, data);
      return;
    }

    console.log(`[agent] reply in ${ms}ms, sending (${data.replyText.length} chars)`);
    await sdk.send(sender, data.replyText);
  } catch (error) {
    console.error("Error handling message:", error);
  }
}

await sdk.startWatching({
  onMessage: async (msg) => {
    const attachCount = msg.attachments?.length ?? 0;
    console.log(`[inbound] sender=${msg.sender} isFromMe=${msg.isFromMe} text=${msg.text} attachments=${attachCount}`);

    if (msg.isFromMe) return;

    const sender = msg.sender;
    const text = msg.text ?? "";

    if (sender !== ALLOWED_NUMBER) {
      console.log(`[skipped] ${sender} is not in the allowed list`);
      return;
    }

    await handleMessage(text, sender, msg.attachments ?? []);
  },
  onError: (err) => {
    console.error("Watcher error:", err);
  },
});

console.log(`Field Coach watching for messages from ${ALLOWED_NUMBER} → agent at ${AGENT_URL}`);
setInterval(() => console.log("[heartbeat] still watching..."), 5000);

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await sdk.close();
  process.exit(0);
});
