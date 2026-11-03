import json, os, sys
cache = os.environ["ZEROTTS_CACHE_DIR"]
os.makedirs(cache, exist_ok=True)
print(json.dumps({"type": "ready", "voices": ["maichi"]}), flush=True)
for line in sys.stdin:
    req = json.loads(line)
    if req["text"] == "boom":
        print(json.dumps({"type": "result", "id": req["id"], "ok": False, "error": "Filtered empty/spam text"}), flush=True)
        continue
    name = f"{req['voice']}_{req['id']}.wav"
    with open(os.path.join(cache, name), "wb") as f:
        f.write(("WAV:" + req["voice"] + ":" + req["text"]).encode())
    print(json.dumps({"type": "result", "id": req["id"], "ok": True, "file": name}), flush=True)
