#!/usr/bin/env python3
"""LoomGuard product demo — FINAL take driver.

Five clips at 10 fps (the 2-core box can't encode faster), recorded with the
virtual cursor, covering the narration timeline:

  A (≈30s) cold open: preloader → hero → SKIP → studio dwell     [s01 + s02]
  B (≈21s) run audit → spinner → results land                     [s03]
  C (≈33s) findings scroll → voice-cliché surgical diff card      [s04 + s05]
  D (≈35s) checkout panel → drip trace drawer → provenance        [s06 + s07]
  E (≈24s) review workflow approve → insights → audit trail       [s08 + s09]

All waits are eval-based DOM visibility checks (the CLI's wait --text proved
unreliable). Every beat is timestamped per-clip for narration sync in post.
"""
import subprocess, time, json, sys

DIR = "/home/z/my-project/video-build"
TL_PATH = f"{DIR}/timeline_final.json"
TL = {"clips": []}
CUR = None  # current clip dict

def ab(*args, timeout=120):
    return subprocess.run(["agent-browser", *args], capture_output=True, text=True, timeout=timeout)

def log(event):
    t = time.time() - CUR["t0"]
    CUR["events"].append({"event": event, "t": round(t, 2)})
    print(f"[{CUR['name']} {t:6.2f}] {event}", flush=True)

def sleep_until(target):
    d = target - (time.time() - CUR["t0"])
    if d > 0:
        time.sleep(d)

def ev(js):
    r = ab("eval", js, timeout=60)
    return (r.stdout or "").strip().strip('"')

def scroll_by(px):
    return ev(f"window.scrollBy({{top: {px}, behavior: 'smooth'}}); 'OK'")

def text_visible(text):
    js = (
        "(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; "
        f"while (n = w.nextNode()) {{ if (n.textContent.includes({json.dumps(text)}) && n.parentElement) {{ "
        "try { if (n.parentElement.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) return true; } catch (e) {} "
        "const r = n.parentElement.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return true; } } return false; })()"
    )
    return ev(js) == "true"

def poll_visible(text, timeout=90, interval=0.35):
    t0 = time.time() - CUR["t0"]
    while (time.time() - CUR["t0"]) - t0 < timeout:
        if text_visible(text):
            return True
        time.sleep(interval)
    return False

def click_btn(name):
    return ab("find", "role", "button", "click", "--name", name, timeout=60).returncode == 0

def click_tab(name):
    return ab("find", "role", "tab", "click", "--name", name, timeout=60).returncode == 0

def mouse_click_at(x, y):
    ab("mouse", "move", str(x), str(y), timeout=30)
    time.sleep(0.28)
    ab("mouse", "down", "left", timeout=30)
    time.sleep(0.07)
    ab("mouse", "up", "left", timeout=30)
    return "OK"

def center_of(js):
    out = ev(js)
    try:
        return json.loads(out.replace('\\"', '"'))
    except Exception:
        return {"found": False, "raw": out[:80]}

# ── JS locators ──────────────────────────────────────────────
JS_VOICE_CARD = r"""(() => {
  const leaf = [...document.querySelectorAll('del,ins,span,p,div')].find(x => x.children.length === 0 && /Delve/.test(x.textContent || ''));
  if (!leaf) return 'NOT FOUND';
  let card = leaf;
  while (card && !(card.textContent.includes('Trace Provenance') && card.textContent.includes('intent-preservation')))
    card = card.parentElement;
  if (!card) return 'NO CARD';
  card.scrollIntoView({behavior: 'smooth', block: 'center'});
  return 'OK';
})()"""

JS_CHECKOUT_VIEW = r"""(() => {
  const h = [...document.querySelectorAll('h1,h2,h3,h4,h5,span,div,p')].find(
    x => x.textContent.trim() === 'Checkout Truth Engine');
  if (!h) return 'NOT FOUND';
  h.scrollIntoView({behavior: 'smooth', block: 'start'});
  return 'OK';
})()"""

JS_TRACE_SCROLL = r"""(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Trace Provenance'));
  for (const b of btns) {
    let card = b.parentElement;
    while (card && card !== document.body) {
      const t = card.textContent;
      if (t.includes('intent-preservation') && t.includes('Accept Surgical Fix') && t.includes('Drip-pricing exposure')) {
        if (card.getBoundingClientRect().height < 900) {
          card.scrollIntoView({behavior: 'smooth', block: 'center'});
          return 'SCROLLED';
        }
      }
      card = card.parentElement;
    }
  }
  return 'NOT FOUND';
})()"""

JS_TRACE_RECT = r"""(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Trace Provenance'));
  for (const b of btns) {
    let card = b.parentElement;
    while (card && card !== document.body) {
      const t = card.textContent;
      if (t.includes('intent-preservation') && t.includes('Accept Surgical Fix') && t.includes('Drip-pricing exposure')) {
        if (card.getBoundingClientRect().height < 900) {
          const r = b.getBoundingClientRect();
          return JSON.stringify({found: true, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)});
        }
      }
      card = card.parentElement;
    }
  }
  return JSON.stringify({found: false});
})()"""

JS_ROLE_COMBO = r"""(() => {
  const el = [...document.querySelectorAll('[role="combobox"]')].find(x => x.textContent.trim() === 'Creator');
  if (!el) return JSON.stringify({found: false});
  const r = el.getBoundingClientRect();
  return JSON.stringify({found: true, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)});
})()"""

JS_ROLE_OPTION = r"""(() => {
  const el = [...document.querySelectorAll('[role="option"]')].find(x => x.textContent.trim() === 'Brand Manager');
  if (!el) return JSON.stringify({found: false});
  const r = el.getBoundingClientRect();
  return JSON.stringify({found: true, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)});
})()"""

JS_ASSET_COMBO = r"""(() => {
  const el = [...document.querySelectorAll('[role="combobox"]')].find(x => x.textContent.trim() !== 'Creator');
  if (!el) return JSON.stringify({found: false});
  const r = el.getBoundingClientRect();
  return JSON.stringify({found: true, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)});
})()"""

JS_AURELIA_OPTION = r"""(() => {
  const el = [...document.querySelectorAll('[role="option"]')].find(x => x.textContent.includes('Aurelia Black'));
  if (!el) return JSON.stringify({found: false});
  const r = el.getBoundingClientRect();
  return JSON.stringify({found: true, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)});
})()"""

def drawer_scroll(px):
    return ev(
        "(() => { const sc=[...document.querySelectorAll('div')].find(d=>String(d.className)."
        f"includes('sm:max-w-lg')); if(!sc) return 'NO'; sc.scrollBy({{top:{px}, behavior:'smooth'}}); "
        "return 'OK'; })()"
    )

def start_clip(name, path, url=None):
    global CUR
    args = ["record", "start", path]
    if url:
        args.append(url)
    args += ["--fps", "10", "--cursor"]
    r = ab(*args, timeout=120)
    ok = "started" in (r.stdout or "").lower()
    print(f"▶ record {name}: {(r.stdout or '').strip()} {(r.stderr or '').strip()}", flush=True)
    if not ok:
        print(f"FATAL: could not start clip {name}"); sys.exit(1)
    CUR = {"name": name, "path": path, "t0": time.time(), "events": []}
    TL["clips"].append(CUR)

def stop_clip():
    r = ab("record", "stop", timeout=120)
    print(f"■ stop: {(r.stdout or '').strip()} {(r.stderr or '').strip()}", flush=True)
    if "saved" not in (r.stdout or "").lower():
        print("WARNING: clip may not have saved cleanly!")
    time.sleep(1.2)

def save_timeline():
    with open(TL_PATH, "w") as f:
        json.dump(TL, f, indent=1)
    print("TIMELINE SAVED:", TL_PATH)

# ═══════════════════════════════════════════════════════════════
def main():
    # fresh page so the navigation in clip A is a true cold load
    ab("open", "about:blank", timeout=60)
    ab("set", "viewport", "1920", "1080", timeout=60)

    # ── CLIP A — cold open (s01 + s02) ─────────────────────────
    start_clip("A", f"{DIR}/clipA.mp4", "http://localhost:3000/")
    if not poll_visible("SKIP → PRODUCT", 45):
        print("FATAL: hero never appeared"); save_timeline(); sys.exit(1)
    log("hero_ready")
    sleep_until(14.3)
    ok = ab("find", "text", "SKIP → PRODUCT", "click", timeout=60).returncode == 0
    if not ok:
        ok = click_btn("SKIP → PRODUCT")
    log(f"skip_clicked ({'OK' if ok else 'FAIL'})")
    if not poll_visible("Run Pre-Publication Audit", 40):
        print("FATAL: product never loaded"); save_timeline(); sys.exit(1)
    log("product_loaded")
    # Ensure the Aurelia demo asset is the active draft (on camera if needed —
    # the narration names it right as the selection lands).
    if not poll_visible("Aurelia Black", 4):
        log("asset_selection_needed")
        d = center_of(JS_ASSET_COMBO)
        if d.get("found"):
            log(f"asset_combo {mouse_click_at(d['x'], d['y'])}")
        else:
            log(f"asset_combo FAILED {d}")
        time.sleep(0.6)
        d = center_of(JS_AURELIA_OPTION)
        if d.get("found"):
            log(f"aurelia_option {mouse_click_at(d['x'], d['y'])}")
        else:
            log(f"aurelia_option FAILED {d}")
        if not poll_visible("Aurelia Black", 6):
            log("WARN: Aurelia still not visible")
    else:
        log("aurelia_default")
    sleep_until(24.5)
    log(f"s2_scroll_down {scroll_by(340)}")
    sleep_until(27.8)
    log(f"s2_scroll_up {scroll_by(-340)}")
    sleep_until(30.6)
    stop_clip()

    # ── CLIP B — the audit (s03) ───────────────────────────────
    start_clip("B", f"{DIR}/clipB.mp4")
    sleep_until(0.3)
    ok = click_btn("Run Pre-Publication Audit")
    log(f"run_clicked ({'OK' if ok else 'FAIL'})")
    if not poll_visible("Audit Readiness", 100):
        print("FATAL: audit never completed"); save_timeline(); sys.exit(1)
    log("results_ready")
    if not poll_visible("DRIP PRICING", 8):
        log("WARN: DRIP PRICING not visible")
    sleep_until(20.6)
    stop_clip()

    # ── CLIP C — findings + surgical diff (s04 + s05) ──────────
    start_clip("C", f"{DIR}/clipC.mp4")
    sleep_until(6.5)
    log(f"f_scroll1 {scroll_by(520)}")
    sleep_until(11.8)
    log(f"f_scroll2 {scroll_by(520)}")
    sleep_until(17.0)
    log(f"f_scroll3 {scroll_by(480)}")
    sleep_until(20.5)
    log(f"voice_card {ev(JS_VOICE_CARD)}")
    sleep_until(35.2)
    stop_clip()

    # ── CLIP D — checkout truth + trace drawer (s06 + s07) ─────
    start_clip("D", f"{DIR}/clipD.mp4")
    sleep_until(0.4)
    log(f"checkout_view {ev(JS_CHECKOUT_VIEW)}")
    sleep_until(21.5)
    log(f"trace_scroll {ev(JS_TRACE_SCROLL)}")
    time.sleep(1.2)  # let the smooth scroll settle
    d = center_of(JS_TRACE_RECT)
    if d.get("found"):
        log(f"trace_click {mouse_click_at(d['x'], d['y'])} @({d['x']},{d['y']})")
    else:
        log(f"trace_locate FAILED {d}")
    if not poll_visible("PayPal Order Receipt", 10):
        log("WARN: receipt not visible")
    sleep_until(26.6)
    log(f"drawer_scroll1 {drawer_scroll(420)}")
    sleep_until(31.0)
    log(f"drawer_scroll2 {drawer_scroll(240)}")
    sleep_until(34.6)
    stop_clip()

    # ── CLIP E — workflow + insights + trail (s08 + s09) ───────
    start_clip("E", f"{DIR}/clipE.mp4")
    sleep_until(0.5)
    ab("press", "Escape", timeout=30)
    log("drawer_closed")
    sleep_until(1.5)
    log(f"wf_tab {click_tab('Review Workflow')}")
    sleep_until(2.4)
    d = center_of(JS_ROLE_COMBO)
    if d.get("found"):
        log(f"role_combo {mouse_click_at(d['x'], d['y'])}")
    else:
        log(f"role_combo FAILED {d}")
    sleep_until(3.6)
    d = center_of(JS_ROLE_OPTION)
    if d.get("found"):
        log(f"role_option {mouse_click_at(d['x'], d['y'])}")
    else:
        log(f"role_option FAILED {d}")
    if not poll_visible("Approve for Publish", 10):
        log("WARN: approve button not visible")
    sleep_until(6.5)
    log(f"approve_clicked {click_btn('Approve for Publish')}")
    sleep_until(12.2)
    log(f"insights_tab {click_tab('Governance Insights')}")
    sleep_until(18.4)
    log(f"trail_tab {click_tab('Audit Trail')}")
    sleep_until(24.0)
    stop_clip()

    save_timeline()
    print("\nALL CLIPS DONE")

if __name__ == "__main__":
    main()
