#!/usr/bin/env python3
"""Assemble the LoomGuard product demo film.

  clips A–E (10fps, cursor) ── minterpolate blend ──▶ 30fps
        + end card (8s, faded)
        + 10 narration segments placed at beat-aligned offsets
        + loudnorm to −16 LUFS (broadcast-clear voice)
  ──▶ download/loomguard-demo.mp4  (< 3:00)
"""
import subprocess, json, os, sys

DIR = "/home/z/my-project/video-build"
OUT = "/home/z/my-project/download/loomguard-demo.mp4"

def sh(cmd, timeout=1200):
    print("→", " ".join(cmd[:8]), "…" if len(cmd) > 8 else "", flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        print(r.stderr[-1800:])
        sys.exit(f"FAILED: {' '.join(cmd[:6])}")
    return r

def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())

# ── 1. probe clips ───────────────────────────────────────────
clips = {c: f"{DIR}/clip{c}.mp4" for c in "ABCDE"}
d = {c: dur(p) for c, p in clips.items()}
g = {"A": 0.0}
for i, c in enumerate("BCDE"):
    g[c] = g["ABCDE"[i]] + d["ABCDE"[i]]
ENDCARD_LEN = 8.0
total = g["E"] + d["E"] + ENDCARD_LEN
print("clip starts:", {k: round(v, 2) for k, v in g.items()})
print(f"total video: {total:.1f}s = {int(total//60)}:{int(total%60):02d}")

# ── 2. narration placement (beat-aligned) ────────────────────
skip_A, results_B, voice_C, trace_D, insights_E = 15.56, 6.27, 20.54, 23.48, 12.33
audio = {
    "s01": 1.0,
    "s02": g["A"] + skip_A + 1.0,
    "s03": g["B"] + 0.55,
    "s04": max(g["B"] + results_B + 0.4, 0.0),   # refined below vs s03 end
    "s05": g["C"] + voice_C + 0.6,
    "s06": g["D"] + 0.55,
    "s07": g["D"] + trace_D + 1.3,
    "s08": g["E"] + 1.4,
    "s09": g["E"] + insights_E + 0.3,
    "s10": g["E"] + d["E"] + 1.2,  # into the end card
}
adur = {s: dur(f"{DIR}/audio/{s}.wav") for s in audio}
# enforce min gaps (0.5s) sequentially
keys = list(audio.keys())
for i in range(1, len(keys)):
    prev, cur = keys[i - 1], keys[i]
    min_start = audio[prev] + adur[prev] + 0.5
    if audio[cur] < min_start:
        audio[cur] = min_start
# s04 must also start at/after s03 end + 0.55
audio["s04"] = max(audio["s04"], audio["s03"] + adur["s03"] + 0.55)
for i in range(1, len(keys)):
    prev, cur = keys[i - 1], keys[i]
    min_start = audio[prev] + adur[prev] + 0.5
    if audio[cur] < min_start:
        audio[cur] = min_start

print("narration map:")
for s in keys:
    print(f"  {s}: start {audio[s]:7.2f}  end {audio[s] + adur[s]:7.2f}")
if audio["s10"] + adur["s10"] > total - 0.4:
    sys.exit(f"FATAL: s10 overruns end card ({audio['s10'] + adur['s10']:.1f} > {total:.1f})")

with open(f"{DIR}/final_timeline.json", "w") as f:
    json.dump({"total": total, "clip_starts": g, "clip_durs": d, "audio": audio,
               "audio_durs": adur, "endcard_len": ENDCARD_LEN}, f, indent=1)

# ── 3. per-clip: 10fps → 30fps (blend interpolation) ─────────
proc = {}
for c in "ABCDE":
    src, dst = clips[c], f"{DIR}/proc{c}.mp4"
    vf = "minterpolate=fps=30:mi_mode=blend,format=yuv420p"
    if c == "A":
        vf += ",fade=t=in:st=0:d=0.6"
    sh(["ffmpeg", "-y", "-v", "error", "-i", src, "-vf", vf,
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-an", dst])
    proc[c] = dst
    print(f"  proc{c} ok ({dur(dst):.1f}s)")

# end card
sh(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", f"{DIR}/endcard.png",
    "-t", str(ENDCARD_LEN), "-vf", "fps=30,format=yuv420p,fade=t=in:st=0:d=0.8,fade=t=out:st=6.7:d=1.2",
    "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-an", f"{DIR}/procF.mp4"])
print(f"  endcard ok ({dur(f'{DIR}/procF.mp4'):.1f}s)")

# ── 4. concat ────────────────────────────────────────────────
with open(f"{DIR}/concat.txt", "w") as f:
    for c in "ABCDEF":
        f.write(f"file '{DIR}/proc{c}.mp4'\n")
sh(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{DIR}/concat.txt",
    "-c", "copy", f"{DIR}/video_only.mp4"])
vdur = dur(f"{DIR}/video_only.mp4")
print(f"concat ok ({vdur:.1f}s)")

# ── 5. voiceover track ───────────────────────────────────────
inputs = []
for s in keys:
    inputs += ["-i", f"{DIR}/audio/{s}.wav"]
fc, mix = [], []
for i, s in enumerate(keys):
    delay_ms = int(round(audio[s] * 1000))
    fc.append(f"[{i}:a]aresample=48000,adelay={delay_ms}:all=1[a{i}]")
    mix.append(f"[a{i}]")
fc.append(
    "".join(mix)
    + "amix=inputs=10:normalize=0,"
    + "highpass=f=75,treble=g=1.5:f=4000,"
    + "loudnorm=I=-16:TP=-1.5:LRA=11,"
    + "aresample=48000[aout]"
)
sh(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(fc),
    "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", f"{DIR}/voiceover.m4a"])
print(f"voiceover ok ({dur(f'{DIR}/voiceover.m4a'):.1f}s)")

# ── 6. mux ───────────────────────────────────────────────────
sh(["ffmpeg", "-y", "-v", "error", "-i", f"{DIR}/video_only.mp4", "-i", f"{DIR}/voiceover.m4a",
    "-c", "copy", "-movflags", "+faststart", OUT])
print(f"\nFINAL: {OUT}  {dur(OUT):.1f}s = {int(dur(OUT)//60)}:{int(dur(OUT)%60):02d}  "
      f"{os.path.getsize(OUT)/1e6:.1f} MB")
