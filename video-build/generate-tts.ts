// Generate the 10 voiceover segments for the LoomGuard product demo film.
// Voice: kazi (clear standard) · speed 0.96 · wav 24kHz
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUT = path.join(import.meta.dir, "audio");
fs.mkdirSync(OUT, { recursive: true });

const SEGMENTS: Array<{ id: string; text: string }> = [
  {
    id: "s01",
    text: "Every brand is a fabric — woven from every word, every color, every claim it ships to the world. And one wrong thread can unravel the whole thing. This is LoomGuard. Watch it work.",
  },
  {
    id: "s02",
    text: "This is the Proofing Studio. On the left, a real campaign draft — the Aurelia Black spring rewards email. On the right, the audit bay. One click: run the pre-publication audit.",
  },
  {
    id: "s03",
    text: "Stage one — deterministic engines: terminology, color science, accessibility, confidentiality. Under fifty milliseconds. Stage two — a semantic A.I. pass that grounds every claim against the brand's living fact ledger.",
  },
  {
    id: "s04",
    text: "The verdict is back in seconds. Audit readiness: zero. A superseded interest rate. An unsubstantiated lowest-rate-ever claim. Nine findings — every one citing its rule, its evidence, and its fix.",
  },
  {
    id: "s05",
    text: "LoomGuard never rewrites your words. It proposes a surgical diff — with a ninety-eight percent intent-preservation score. Below the intent gate, automation stops — and a human takes over.",
  },
  {
    id: "s06",
    text: "Now, the pillar nobody else checks: transaction integrity. Every price in the draft is extracted, structured by A.I., and re-charged through the PayPal Orders API. This email advertises nineteen dollars a month — but the checkout charges twenty-four ninety-nine. Drip pricing — caught, with the PayPal order on record, before a single customer ever sees it.",
  },
  {
    id: "s07",
    text: "Every finding carries its own paper trail. Engine, model, prompt version, latency — sealed in an append-only ledger.",
  },
  {
    id: "s08",
    text: "And humans stay in command. Reviewers approve, edit, or override — with a recorded justification that carries forward to every future audit.",
  },
  {
    id: "s09",
    text: "Governance insights show which rules fire most. And when the guideline itself is the problem, A.I. drafts the rewrite. Every action lands in the audit trail.",
  },
  {
    id: "s10",
    text: "LoomGuard. A.I. with receipts. The fabric of trust.",
  },
];

async function ttsWithRetry(zai: Awaited<ReturnType<typeof ZAI.create>>, text: string, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      return await zai.audio.tts.create({
        input: text,
        voice: "xiaochen",
        speed: 0.95,
        response_format: "wav",
        stream: false,
      });
    } catch (e) {
      const wait = 30000 * (i + 1);
      console.log(`  … retry ${i + 1}/${tries} in ${wait / 1000}s (${(e as Error).message.slice(0, 60)})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("TTS failed after retries");
}

async function main() {
  const zai = await ZAI.create();
  const manifest: Array<{ id: string; chars: number }> = [];
  for (const seg of SEGMENTS) {
    const outPath = path.join(OUT, `${seg.id}.wav`);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 40000) {
      console.log(`✓ ${seg.id} exists, skipping`);
      manifest.push({ id: seg.id, chars: seg.text.length });
      continue;
    }
    const res = await ttsWithRetry(zai, seg.text);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    fs.writeFileSync(outPath, buffer);
    console.log(`✓ ${seg.id} → ${(buffer.length / 1024).toFixed(0)} KB (${seg.text.length} chars)`);
    manifest.push({ id: seg.id, chars: seg.text.length });
    await new Promise((r) => setTimeout(r, 22000));
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("DONE");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
