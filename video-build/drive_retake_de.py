#!/usr/bin/env python3
"""Retake clips D + E only (A, B, C from the last take are good).

Prep: put the packet back in the Brand Manager queue (its approve will be
re-performed on camera), switch to the Proofing Studio tab, then re-record
clip D (checkout truth + drip trace drawer) and clip E (workflow + tabs)
with the fixed two-phase trace click.
"""
import sys, time, json, subprocess

sys.path.insert(0, "/home/z/my-project/video-build")
import importlib.util

spec = importlib.util.spec_from_file_location("df", "/home/z/my-project/video-build/drive_final.py")
df = importlib.util.module_from_spec(spec)
spec.loader.exec_module(df)

DIR = "/home/z/my-project/video-build"
TL_PATH = f"{DIR}/timeline_retake_de.json"
TL = {"clips": []}

def ClipCtx(name):
    return {"name": name, "t0": time.time(), "events": []}

def main():
    # 0. prep state: packet back to IN_REVIEW (Aurelia's audit results stay!)
    subprocess.run(["python3", "-c", """
import sqlite3
con = sqlite3.connect('/home/z/my-project/db/custom.db')
con.execute("UPDATE Asset SET status='IN_REVIEW', assigneeRole='BRAND_MANAGER' WHERE title LIKE 'Product Launch%'")
con.commit()
print('packet -> IN_REVIEW')
"""], check=True, capture_output=True)

    # 1. switch to the Proofing Studio tab (pre-recording)
    r = df.ab("find", "role", "tab", "click", "--name", "Proofing Studio", timeout=60)
    print("studio tab:", r.returncode == 0)
    time.sleep(1.5)
    if not df.text_visible("Run Pre-Publication Audit"):
        print("FATAL: studio not visible"); sys.exit(1)
    # scroll back near the findings area so clip D's start framing is sane
    df.ev("window.scrollTo({top: 0, behavior: 'smooth'}); 'OK'")
    time.sleep(1.2)

    # ── CLIP D retake ──────────────────────────────────────────
    df.CUR = ClipCtx("D")
    TL["clips"].append(df.CUR)
    r = df.ab("record", "start", f"{DIR}/clipD.mp4", "--fps", "10", "--cursor", timeout=120)
    print("record D:", (r.stdout or "").strip())
    if "started" not in (r.stdout or "").lower():
        print("FATAL: clip D record failed"); sys.exit(1)
    df.CUR["t0"] = time.time()

    df.sleep_until(0.4)
    df.log(f"checkout_view {df.ev(df.JS_CHECKOUT_VIEW)}")
    df.sleep_until(21.5)
    df.log(f"trace_scroll {df.ev(df.JS_TRACE_SCROLL)}")
    time.sleep(1.2)
    d = df.center_of(df.JS_TRACE_RECT)
    if d.get("found"):
        df.log(f"trace_click {df.mouse_click_at(d['x'], d['y'])} @({d['x']},{d['y']})")
    else:
        df.log(f"trace_locate FAILED {d}")
    if not df.poll_visible("PayPal Order Receipt", 10):
        df.log("WARN: receipt not visible")
    df.sleep_until(26.6)
    df.log(f"drawer_scroll1 {df.drawer_scroll(420)}")
    df.sleep_until(31.0)
    df.log(f"drawer_scroll2 {df.drawer_scroll(240)}")
    df.sleep_until(34.6)
    r = df.ab("record", "stop", timeout=120)
    print("stop D:", (r.stdout or "").strip())
    time.sleep(1.2)

    # ── CLIP E retake ──────────────────────────────────────────
    df.CUR = ClipCtx("E")
    TL["clips"].append(df.CUR)
    r = df.ab("record", "start", f"{DIR}/clipE.mp4", "--fps", "10", "--cursor", timeout=120)
    print("record E:", (r.stdout or "").strip())
    if "started" not in (r.stdout or "").lower():
        print("FATAL: clip E record failed"); sys.exit(1)
    df.CUR["t0"] = time.time()

    df.sleep_until(0.5)
    df.ab("press", "Escape", timeout=30)
    df.log("drawer_closed")
    df.sleep_until(1.5)
    df.log(f"wf_tab {df.click_tab('Review Workflow')}")
    df.sleep_until(2.4)
    d = df.center_of(df.JS_ROLE_COMBO)
    if d.get("found"):
        df.log(f"role_combo {df.mouse_click_at(d['x'], d['y'])}")
    else:
        df.log(f"role_combo FAILED {d}")
    df.sleep_until(3.6)
    d = df.center_of(df.JS_ROLE_OPTION)
    if d.get("found"):
        df.log(f"role_option {df.mouse_click_at(d['x'], d['y'])}")
    else:
        df.log(f"role_option FAILED {d}")
    if not df.poll_visible("Approve for Publish", 10):
        df.log("WARN: approve button not visible")
    df.sleep_until(6.5)
    df.log(f"approve_clicked {df.click_btn('Approve for Publish')}")
    df.sleep_until(12.2)
    df.log(f"insights_tab {df.click_tab('Governance Insights')}")
    df.sleep_until(18.4)
    df.log(f"trail_tab {df.click_tab('Audit Trail')}")
    df.sleep_until(24.0)
    r = df.ab("record", "stop", timeout=120)
    print("stop E:", (r.stdout or "").strip())

    with open(TL_PATH, "w") as f:
        json.dump(TL, f, indent=1)
    print("RETAKE DONE:", TL_PATH)

if __name__ == "__main__":
    main()
