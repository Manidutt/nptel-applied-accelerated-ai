# Instructor Runbook — Week 11 Smart-City IVA Demo

## Learning outcome
Students should understand that an IVA system is not just an object detector. The application stack is:

**perception → identity over time → spatial/temporal rules → structured events → decision support**

## Before class
1. Open the Colab notebook.
2. Select GPU runtime.
3. Install requirements.
4. Confirm CUDA is available.
5. Let `yolo26n.pt` download once.
6. Upload a 20–60 second video.
7. Run only 100–200 frames first.
8. Confirm people or vehicles are detected.
9. Adjust ROI polygon and virtual line in `config.yaml`.
10. Run the full clip once before class.
11. Keep the generated annotated video as a backup.

## Live sequence

### Part 1 — Raw frame and problem statement (0–8 min)
Show one frame. Ask:
- What can a detector tell us?
- Can one frame tell us how long a person has been present?
- Can one frame tell us whether a vehicle is the same one seen two seconds earlier?

State:
- Detection = what and where now.
- Tracking = same object over time.

### Part 2 — Detection and tracking (8–20 min)
Run:

```bash
python run_demo.py --source input.mp4 --config config.yaml --output-dir outputs_quick --max-frames 200
```

Show the annotated clip and point out boxes, class names, confidence values, and track IDs.

Explain that `persist=True` keeps tracker state between frame calls.

### Part 3 — ROI and loitering (20–38 min)
Show the ROI polygon in `config.yaml`.

Explain the event condition:

`outside → inside = restricted-zone entry`

For dwell time:

`current_time - entry_time(track_id) >= threshold`

For a short demo, reduce `loiter_seconds` to 2.0 if needed.

### Part 4 — Virtual line and crowd threshold (38–50 min)
Explain that the motion of a track center from the previous frame to the current frame forms a small segment. If it intersects the configured virtual line, the system records a line-crossing event.

Crowd event:
- count tracked persons currently inside ROI,
- compare with threshold,
- use cooldown to avoid one alert every frame.

### Part 5 — Structured event log (50–62 min)
Open `outputs/events.jsonl`.

Point out:
- timestamp,
- frame index,
- event type,
- track ID,
- class,
- confidence,
- severity,
- region or line.

Ask why structured events are useful:
- searchable,
- database friendly,
- easy to aggregate,
- easy to trigger downstream actions,
- easier for an LLM to summarize than raw video.

### Part 6 — Deterministic report (62–72 min)
Run:

```bash
python summarize_events.py --events outputs/events.jsonl --out-dir outputs
```

Show `incident_report.json` and `incident_report.txt`.

Emphasize that the first report is auditable and does not require an LLM.

### Part 7 — Optional LLM summary (72–80 min)
Run the optional local model.

Ask:
- Which component decides that a person entered the ROI? Answer: event engine.
- What does the LLM do? Answer: summarize already-detected structured facts.

Do not make face-identity, intent, causal, or threat claims.

### Part 8 — Performance (80–87 min)
Open `metrics.json`.

Explain:
- average inference time = model component,
- wall FPS = whole application.

Whole application includes:
- decode,
- detector,
- tracker,
- event engine,
- overlays,
- encoding.

Ask: if detector latency improves 2×, does whole-app FPS always improve 2×? No.

### Part 9 — Synthesis (87–90 min)
Finish with:

**camera → perception → tracking → semantics → events → report**

Ask students to invent one additional event rule, and require them to specify:
1. required object classes,
2. spatial condition,
3. temporal condition,
4. event output,
5. likely failure cases,
6. evaluation metric.
