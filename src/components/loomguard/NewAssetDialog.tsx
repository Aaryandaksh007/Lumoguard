"use client";

import { useState } from "react";
import { FilePlus2, Loader2, PackageOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DEMO_VISUAL_META } from "@/lib/constants";

export function NewAssetDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (assetId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState<"blank" | "demo" | null>(null);

  async function create(payload: Record<string, unknown>, kind: "blank" | "demo") {
    setBusy(kind);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Creation failed");
      toast.success(kind === "demo" ? "Demo launch packet loaded" : "Draft created", {
        description:
          kind === "demo"
            ? "The packet contains the six canonical planted errors — run the audit to catch them."
            : "Paste content and run the pre-publication audit when ready.",
      });
      onCreated(data.id);
      onOpenChange(false);
      setTitle("");
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-slate-500" aria-hidden />
            New governed asset
          </DialogTitle>
          <DialogDescription>
            Create a blank draft, or load the official demo packet — a press release + hero
            banner containing six planted governance errors (deprecated name, unsubstantiated
            claim, secret codename, palette drift, logo distortion, low contrast).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 border-slate-300 py-3 text-left"
            disabled={busy !== null}
            onClick={() => create({ demo: true }, "demo")}
          >
            {busy === "demo" ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <PackageOpen className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            )}
            <span>
              <span className="block text-[13.5px] font-bold">Load Official Demo Launch Packet</span>
              <span className="block text-[12px] font-normal text-slate-500">
                Press release + hero banner with 6 planted errors · fastest way to see all six pillars fire
              </span>
            </span>
          </Button>

          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-title" className="text-[12px] font-semibold">
                Blank draft title
              </Label>
              <Input
                id="asset-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Product Launch — Landing Page"
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-content" className="text-[12px] font-semibold">
                Content (markdown or HTML)
              </Label>
              <Textarea
                id="asset-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"# Your headline\n\nPaste press release markdown or landing-page HTML here…"}
                className="min-h-28 font-mono text-[12px]"
              />
            </div>
            <Button
              size="sm"
              className="bg-slate-900 text-[12.5px] font-semibold hover:bg-slate-800"
              disabled={!title.trim() || busy !== null}
              onClick={() =>
                create(
                  {
                    title: title.trim(),
                    content,
                    assetType: content.includes("<") && content.includes(">") ? "HTML" : "MARKDOWN",
                    visualMeta: DEMO_VISUAL_META,
                  },
                  "blank"
                )
              }
            >
              {busy === "blank" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Create Blank Draft
            </Button>
            <p className="text-[11px] text-slate-400">
              New drafts attach the demo hero-banner visual metadata so the visual pipeline is
              exercisable immediately (editable later from the API).
            </p>
          </div>
        </div>

        <DialogFooter className="sr-only">
          <span>Create asset dialog actions</span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
