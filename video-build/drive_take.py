#!/usr/bin/env python3
"""LoomGuard product demo — recorded take driver.

Drives agent-browser through the full product journey while video-recording,
logging a timestamp for every visual beat so the voiceover can be aligned
exactly in post-production.
"""
import subprocess, time, json, sys

TAKE = "/home/z/my-project/video-build/take1.webm"
TL_PATH = "/home/z/my-project/video-build/timeline.json"
T0 = None
TL = []

def ab(*args, timeout=90):
    return subprocess.run(["agent-browser", *args], capture_output=True, text=True, timeout=timeout)

def log(event):
    t = time.time() - T0
    TL.append({"event": event, "t": round(t, 2)})
    print(f"[{t:7.2f}] {event}", flush=True)

def sleep_until(target):
    d = target - (time.time() - T0)
    if d > 0:
        time.sleep(d)

def wait_text(text, timeout=60, quiet=False):
    t_start = time.time() - T0
    r = ab("wait", "--text", text, "--timeout", str(int(timeout * 1000)))
    ok = r.returncode == 0
    if not quiet:
        log(f"wait:{text[:34]} -> {'OK' if ok else 'FAIL'} ({time.time()-T0 - t_start:.1f}s)")
    return ok

def ev(js):
    r = ab("eval", js)
    return (r.stdout or "").strip().replace('"', '')

def click_btn(name):
    r = ab("find", "role", "button", "click", "--name", name)
    return r.returncode == 0

def click_tab(name):
    r = ab("find", "role", "tab", "click", "--name", name)
    return r.returncode == 0

def scroll_by(px):
    return ev(f"window.scrollBy({{top: {px}, behavior: 'smooth'}}); 'OK'")

JS_VOICE_CARD = (
    "(() => { const leaf=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&/Delve/"
    "/.test(x.textContent||'')); if(!leaf) return 'NOT FOUND'; let card=leaf; while(card&&!(card."
    "textContent.includes('Trace Provenance')&&card.textContent.includes('intent-preservation'))) "
    "card=card.parentElement; if(!card) return 'NO CARD'; card.scrollIntoView({behavior:'smooth',"
    "block:'center'}); return 'OK'; })()"
)
JS_CHECKOUT_VIEW = (
    "(() => { const h=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()==="
    "'Checkout Truth Engine'); if(!h) return 'NOT FOUND'; h.scrollIntoView({behavior:'smooth',"
    "block:'start'}); return 'OK'; })()"
)
JS_TRACE_DRIP = (
    "(() => { const btns=[...document.querySelectorAll('button')].filter(b=>b.textContent."
    "includes('Trace Provenance')); for(const b of btns){ let card=b; for(let i=0;i<10&&card;i++){ "
    "if(card.textContent.includes('Drip-pricing exposure')&&card.textContent.includes('Accept "
    "Surgical Fix')) break; card=card.parentElement; } if(card&&card.textContent.includes('Drip-"
    "pricing exposure')&&card.textContent.includes('Accept Surgical Fix')){ card.scrollIntoView("
    "{behavior:'smooth',block:'center'}); b.click(); return 'OK'; } } return 'NOT FOUND'; })()"
)
def drawer_scroll(px):
    return ev(
        "(() => { const sc=[...document.querySelectorAll('div')].find(d=>String(d.className)."
        f"includes('sm:max-w-lg')); if(!sc) return 'NO'; sc.scrollBy({{top:{px}, behavior:'smooth'}}); "
        "return 'OK'; })()"
    )
JS_ROLE_OPEN = (
    "(() => { const el=[...document.querySelectorAll('[role=\"combobox\"]')].find(x=>x.textContent."
    "trim()==='Creator'); if(!el) return 'NOT FOUND'; el.click(); return 'OK'; })()"
)
JS_ROLE_PICK = (
    "(() => { const el=[...document.querySelectorAll('[role=\"option\"]')].find(x=>x.textContent."
    "trim()==='Brand Manager'); if(!el) return 'NOT FOUND'; el.click(); return 'OK'; })()"
)

def main():
    global T0
    ab("set", "viewport", "1920", "1080")
    r = ab("record", "start", TAKE)
    print("record start:", (r.stdout or "").strip(), (r.stderr or "").strip(), flush=True)
    T0 = time.time()

    # ── cold open: preloader → hero (S1 narrates 1.0–15.0) ──
    if not wait_text("SKIP → PRODUCT", 40):
        print("FATAL: hero never appeared"); sys.exit(1)
    log("hero_ready")
    sleep_until(14.3)
    ok = ab("find", "text", "SKIP → PRODUCT", "click").returncode == 0
    if not ok:
        ok = click_btn("SKIP → PRODUCT")
    log(f"skip_clicked ({'OK' if ok else 'FAIL'})")

    # ── product loads (S2 narrates ~15.6–29.4) ──
    if not wait_text("Run Pre-Publication Audit", 40):
        print("FATAL: product never loaded"); sys.exit(1)
    log("product_loaded")
    wait_text("Aurelia Black", 15, quiet=True)

    sleep_until(19.6)
    log(f"s2_scroll_down {scroll_by(340)}")
    sleep_until(25.4)
    log(f"s2_scroll_up {scroll_by(-340)}")

    # ── run the audit (S3 narrates 30.0–48.6) ──
    sleep_until(29.5)
    ok = click_btn("Run Pre-Publication Audit")
    log(f"run_clicked ({'OK' if ok else 'FAIL'})")
    if not wait_text("Audit Readiness", 100):
        print("FATAL: audit never completed"); sys.exit(1)
    log("results_ready")
    wait_text("DRIP PRICING", 8, quiet=True)

    # ── findings scroll (S4 narrates ~49.3–68.2) ──
    sleep_until(49.8)
    log(f"f_scroll1 {scroll_by(520)}")
    sleep_until(54.4)
    log(f"f_scroll2 {scroll_by(520)}")
    sleep_until(59.0)
    log(f"f_scroll3 {scroll_by(480)}")

    # ── voice-cliché surgical diff card (S5 narrates ~68.7–82.1) ──
    sleep_until(67.7)
    log(f"voice_card {ev(JS_VOICE_CARD)}")

    # ── checkout truth panel (S6 narrates ~82.9–106.9) ──
    sleep_until(82.3)
    log(f"checkout_view {ev(JS_CHECKOUT_VIEW)}")

    # ── trace drawer on the drip finding (S7 narrates ~107.4–116.5) ──
    sleep_until(105.5)
    log(f"trace_opened {ev(JS_TRACE_DRIP)}")
    wait_text("PayPal Order Receipt", 8, quiet=True)

    sleep_until(108.4)
    log(f"drawer_scroll1 {drawer_scroll(400)}")
    sleep_until(112.8)
    log(f"drawer_scroll2 {drawer_scroll(230)}")

    # ── review workflow (S8 narrates ~118.5–128.0) ──
    sleep_until(117.0)
    ab("press", "Escape")
    log("drawer_closed")
    sleep_until(118.2)
    log(f"wf_tab {click_tab('Review Workflow')}")
    sleep_until(119.6)
    log(f"role_open {ev(JS_ROLE_OPEN)}")
    sleep_until(120.5)
    log(f"role_switched {ev(JS_ROLE_PICK)}")
    wait_text("Approve for Publish", 8, quiet=True)
    sleep_until(124.3)
    log(f"approve_clicked {click_btn('Approve for Publish')}")

    # ── insights + trail (S9 narrates ~128.5–140.0) ──
    sleep_until(128.2)
    log(f"insights_tab {click_tab('Governance Insights')}")
    sleep_until(134.6)
    log(f"trail_tab {click_tab('Audit Trail')}")

    # ── hold, then stop ──
    sleep_until(142.6)
    r = ab("record", "stop")
    print("record stop:", (r.stdout or "").strip(), (r.stderr or "").strip(), flush=True)
    log("record_stopped")

    with open(TL_PATH, "w") as f:
        json.dump(TL, f, indent=1)
    print("TIMELINE SAVED:", TL_PATH)

if __name__ == "__main__":
    main()
