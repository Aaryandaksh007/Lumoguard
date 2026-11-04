"use client";

import { useEffect, useState } from "react";
import { Ban, BookMarked, CircleDollarSign, Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ciede2000Hex, contrastRatio, hexLuminance } from "@/lib/engines/color-science";
import type { CanonDTO } from "@/lib/api-types";
import { cn } from "@/lib/utils";

export function BrandCanon() {
  const [canon, setCanon] = useState<CanonDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const res = await fetch("/api/canon");
      if (res.ok) setCanon(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  if (loading || !canon) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <BookMarked className="h-5 w-5 text-slate-500" aria-hidden />
          The Living Brand Canon
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-500">
          Guidelines, approved facts, terminology and visual assets parsed into an executable
          specification — not a 50-page PDF stuffed into a context window. Every finding in the
          Proofing Studio cites the exact record it was checked against.
        </p>
      </div>

      <Tabs defaultValue="terms">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="terms" className="text-[12.5px]">
            Terminology ({canon.terms.length})
          </TabsTrigger>
          <TabsTrigger value="facts" className="text-[12.5px]">
            Fact Ledger ({canon.facts.length})
          </TabsTrigger>
          <TabsTrigger value="visuals" className="text-[12.5px]">
            Visual Tokens ({canon.swatches.length})
          </TabsTrigger>
          <TabsTrigger value="secrets" className="text-[12.5px]">
            Deny-List ({canon.codenames.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Terminology rules ─────────────────────────── */}
        <TabsContent value="terms" className="mt-4 space-y-3">
          <AddTermForm onAdded={reload} />
          <div className="grid gap-2 lg:grid-cols-2">
            {canon.terms.map((t) => (
              <Card key={t.termId} data-canon-id={t.termId} className="border-slate-200">
                <CardContent className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "border-0 font-mono text-[10px] font-bold",
                        t.ruleType === "FORBIDDEN"
                          ? "bg-red-600 text-white"
                          : t.ruleType === "DEPRECATED"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-600 text-white"
                      )}
                    >
                      {t.ruleType}
                    </Badge>
                    <span className="font-mono text-[11px] text-slate-400">{t.termId}</span>
                    <DeleteButton kind="term" onDeleted={reload} className="ml-auto" />
                  </div>
                  <p className="font-serif text-[14px]">
                    <span className="rounded bg-red-50 px-1 font-semibold text-red-700 line-through">
                      {t.surfaceForm}
                    </span>
                    {t.replacementToken && (
                      <>
                        {" → "}
                        <span className="rounded bg-emerald-50 px-1 font-semibold text-emerald-700">
                          {t.replacementToken}
                        </span>
                      </>
                    )}
                  </p>
                  {t.allowedContextRegex && (
                    <p className="font-mono text-[10.5px] text-sky-700">
                      exception context: /{t.allowedContextRegex}/
                    </p>
                  )}
                  <p className="text-[11.5px] leading-snug text-slate-500">{t.rationaleCitation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Approved facts ledger ──────────────────────── */}
        <TabsContent value="facts" className="mt-4 space-y-3">
          <AddFactForm onAdded={reload} />
          <div className="space-y-2">
            {canon.facts.map((f) => (
              <Card key={f.factId} data-canon-id={f.factId} className="border-slate-200">
                <CardContent className="space-y-1.5 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "border-0 font-mono text-[10px] font-bold",
                        f.status === "CANONICAL"
                          ? "bg-emerald-600 text-white"
                          : f.status === "SUPERSEDED"
                            ? "bg-slate-400 text-white"
                            : "bg-sky-600 text-white"
                      )}
                    >
                      {f.status}
                    </Badge>
                    <span className="font-mono text-[11px] text-slate-400">{f.factId}</span>
                    {f.supersededByFactId && (
                      <span className="font-mono text-[10px] text-slate-400">
                        → superseded by {f.supersededByFactId}
                      </span>
                    )}
                    <DeleteButton kind="fact" onDeleted={reload} className="ml-auto" />
                  </div>
                  <p className="text-[13.5px] leading-snug text-slate-800">{f.claimAssertion}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] text-slate-500">
                    {f.effectiveDate && <span>effective {f.effectiveDate}</span>}
                    {f.expirationDate && <span>expires {f.expirationDate}</span>}
                    {f.evidenceDocUrl && (
                      <a
                        href={f.evidenceDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 underline decoration-dotted"
                      >
                        evidence ↗
                      </a>
                    )}
                  </div>
                  {f.requiredDisclaimerText && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11.5px] leading-snug text-amber-900">
                      <span className="font-bold">Required disclaimer: </span>
                      {f.requiredDisclaimerText}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Visual design tokens ───────────────────────── */}
        <TabsContent value="visuals" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[12.5px] text-slate-600">
              Canonical mark: <span className="font-semibold">{canon.logoRules.assetName}</span> ·{" "}
              {canon.logoRules.canonicalWidth}×{canon.logoRules.canonicalHeight}px · aspect{" "}
              {canon.logoRules.aspectRatio.toFixed(2)}:1 · clear-space{" "}
              {(canon.logoRules.clearSpaceRatio * 100).toFixed(0)}% of height
            </p>
          </div>
          <AddVisualForm onAdded={reload} />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {canon.swatches.map((s) => {
              const onWhite = contrastRatio(s.hexValue, "#FFFFFF");
              const onSlate50 = contrastRatio(s.hexValue, "#F8FAFC");
              return (
                <Card key={s.tokenName} data-canon-id={s.tokenName} className="overflow-hidden border-slate-200">
                  <div
                    className="flex h-12 items-center justify-center text-[11px] font-bold"
                    style={{
                      backgroundColor: s.hexValue,
                      color: hexLuminance(s.hexValue) > 0.4 ? "#0F172A" : "#FFFFFF",
                    }}
                  >
                    {s.hexValue.toUpperCase()} · L={hexLuminance(s.hexValue).toFixed(3)}
                  </div>
                  <CardContent className="space-y-1 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <p className="text-[12.5px] font-bold">{s.tokenName}</p>
                      <Badge variant="outline" className="ml-auto font-mono text-[9px]">
                        {s.role}
                      </Badge>
                      <DeleteButton kind="visual" onDeleted={reload} compact />
                    </div>
                    <p className="font-mono text-[10px] text-slate-500">
                      CR on #FFF {onWhite.toFixed(2)}:1 · on #F8FAFC {onSlate50.toFixed(2)}:1
                      {s.isBrandCore && <span className="ml-1 text-emerald-600">· core</span>}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Confidential codename deny-list ────────────── */}
        <TabsContent value="secrets" className="mt-4 space-y-3">
          <AddSecretForm onAdded={reload} />
          <Card className="border-slate-200">
            <CardHeader className="px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-[13.5px]">
                <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden />
                Brand Secret Deny-List Recognizer
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 px-4 pb-4">
              {canon.codenames.map((c) => (
                <span
                  key={c}
                  data-canon-id={c}
                  className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 font-mono text-[11.5px] font-semibold text-amber-900"
                >
                  <Ban className="h-3 w-3" aria-hidden />
                  {c}
                  <DeleteButton kind="secret" onDeleted={reload} compact label={`Remove ${c}`} />
                </span>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeleteButton({
  kind,
  onDeleted,
  className,
  compact,
  label = "Delete",
}: {
  kind: "term" | "fact" | "visual" | "secret";
  onDeleted: () => void;
  className?: string;
  compact?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      className={cn(
        compact ? "h-5 w-5 text-slate-400 hover:text-red-600" : "h-7 text-[11px] text-slate-400 hover:text-red-600",
        className
      )}
      disabled={busy}
      aria-label={label}
      onClick={async (e) => {
        e.stopPropagation();
        // For list items the entity id rides on the parent's key; simplest robust path:
        const id = (e.currentTarget.closest("[data-canon-id]") as HTMLElement)?.dataset.canonId;
        if (!id) {
          toast.error("Could not resolve the canon record id");
          return;
        }
        setBusy(true);
        try {
          const res = await fetch(`/api/canon?kind=${kind}&id=${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          toast.success("Removed from canon");
          onDeleted();
        } catch {
          toast.error("Delete failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Trash2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />}
    </Button>
  );
}

function AddTermForm({ onAdded }: { onAdded: () => void }) {
  const [surface, setSurface] = useState("");
  const [replacement, setReplacement] = useState("");
  const [type, setType] = useState("FORBIDDEN");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="border-slate-200 bg-slate-50">
      <CardContent className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_150px_auto]">
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">Flagged term</Label>
          <Input
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="e.g. game-changer"
            className="h-8 text-[12.5px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">Replacement (optional)</Label>
          <Input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="e.g. milestone"
            className="h-8 text-[12.5px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">Rule type</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12.5px]"
            aria-label="Rule type"
          >
            <option>FORBIDDEN</option>
            <option>DEPRECATED</option>
            <option>PREFERRED</option>
            <option>CASE_SENSITIVE</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            className="h-8 bg-slate-900 text-[12px] font-semibold hover:bg-slate-800"
            disabled={!surface.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/api/canon", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    kind: "term",
                    data: {
                      surfaceForm: surface.trim(),
                      replacementToken: replacement.trim() || null,
                      ruleType: type,
                      rationaleCitation: `Workspace Canon addition (${new Date().toLocaleDateString()}): added by Governance Admin.`,
                    },
                  }),
                });
                if (!res.ok) throw new Error();
                toast.success("Terminology rule added to canon");
                setSurface("");
                setReplacement("");
                onAdded();
              } catch {
                toast.error("Failed to add term");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            Add Rule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddFactForm({ onAdded }: { onAdded: () => void }) {
  const [assertion, setAssertion] = useState("");
  const [status, setStatus] = useState("CANONICAL");
  const [disclaimer, setDisclaimer] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="border-slate-200 bg-slate-50">
      <CardContent className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_180px_auto]">
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">
            Approved fact assertion (atomic — one verifiable statement)
          </Label>
          <Input
            value={assertion}
            onChange={(e) => setAssertion(e.target.value)}
            placeholder="e.g. The Platform tier is priced at $29 per seat per month."
            className="h-8 text-[12.5px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12.5px]"
            aria-label="Fact status"
          >
            <option>CANONICAL</option>
            <option>SUPERSEDED</option>
            <option>ROADMAP_ASPIRATIONAL</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            className="h-8 bg-slate-900 text-[12px] font-semibold hover:bg-slate-800"
            disabled={!assertion.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/api/canon", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    kind: "fact",
                    data: {
                      claimAssertion: assertion.trim(),
                      status,
                      requiredDisclaimerText: disclaimer.trim() || null,
                    },
                  }),
                });
                if (!res.ok) throw new Error();
                toast.success("Fact added to the Approved Fact Ledger");
                setAssertion("");
                setDisclaimer("");
                onAdded();
              } catch {
                toast.error("Failed to add fact");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            Add Fact
          </Button>
        </div>
        <div className="space-y-1 sm:col-span-3">
          <Label className="text-[11px] font-semibold text-slate-500">
            Required disclaimer (optional — enforced as mandatory fine print when the fact is cited)
          </Label>
          <Input
            value={disclaimer}
            onChange={(e) => setDisclaimer(e.target.value)}
            placeholder="e.g. Notice: pricing excludes taxes and is subject to change."
            className="h-8 text-[12.5px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AddVisualForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#");
  const [role, setRole] = useState("ACCENT");
  const [busy, setBusy] = useState(false);
  const valid = /^#[0-9A-Fa-f]{6}$/.test(hex);

  return (
    <Card className="border-slate-200 bg-slate-50">
      <CardContent className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_130px_140px_auto]">
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">Token name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Brand-Amber-500"
            className="h-8 text-[12.5px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">Hex</Label>
          <Input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            placeholder="#CA8A04"
            className={cn("h-8 font-mono text-[12.5px]", hex.length > 1 && !valid && "border-red-400")}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12.5px]"
            aria-label="Swatch role"
          >
            <option>PRIMARY</option>
            <option>ACCENT</option>
            <option>SURFACE</option>
            <option>TEXT</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            className="h-8 bg-slate-900 text-[12px] font-semibold hover:bg-slate-800"
            disabled={!name.trim() || !valid || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/api/canon", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ kind: "visual", data: { tokenName: name.trim(), hexValue: hex, role } }),
                });
                if (!res.ok) throw new Error();
                toast.success("Design token added");
                setName("");
                setHex("#");
                onAdded();
              } catch {
                toast.error("Failed to add swatch");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            Add Token
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddSecretForm({ onAdded }: { onAdded: () => void }) {
  const [codename, setCodename] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="border-slate-200 bg-slate-50">
      <CardContent className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-slate-500">
            Confidential codename to intercept before any external transmission
          </Label>
          <Input
            value={codename}
            onChange={(e) => setCodename(e.target.value)}
            placeholder="e.g. Project Nova"
            className="h-8 text-[12.5px]"
          />
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            className="h-8 bg-slate-900 text-[12px] font-semibold hover:bg-slate-800"
            disabled={!codename.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/api/canon", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ kind: "secret", data: { codename: codename.trim() } }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Failed");
                toast.success("Codename added to the deny-list");
                setCodename("");
                onAdded();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to add codename");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            Add Secret
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
