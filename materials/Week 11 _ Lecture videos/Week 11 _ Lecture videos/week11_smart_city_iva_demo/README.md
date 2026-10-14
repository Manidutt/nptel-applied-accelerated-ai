# Week 11 Complete Demonstration Package
## Smart-City Intelligent Video Analytics (IVA) + Event Summarization

### End-to-end pipeline

**Video → YOLO26 detection → multi-object tracking → spatial/temporal analytics → structured events → incident report → optional local-LLM summary**

The LLM is intentionally placed **after** the deterministic analytics stage. The vision pipeline produces structured facts first; the LLM only summarizes those facts.

## What students will see

1. Object detection: person, bicycle, car, motorcycle, bus, truck.
2. Multi-object tracking with persistent IDs.
3. Restricted-zone entry detection.
4. Loitering/dwell-time detection.
5. Virtual-line crossing.
6. Crowd-threshold alerts.
7. GPU/CPU timing and end-to-end FPS.
8. JSON event logging.
9. Deterministic incident reporting.
10. Optional local-LLM natural-language summarization.

## Recommended 90-minute classroom flow

| Time | Activity |
|---|---|
| 0–8 min | Explain the full pipeline |
| 8–20 min | Detection + tracking |
| 20–38 min | ROI, loitering, line crossing |
| 38–50 min | Crowd event and event logic |
| 50–62 min | Inspect JSON events |
| 62–72 min | Deterministic incident report |
| 72–80 min | Optional local LLM summary |
| 80–87 min | GPU/CPU and end-to-end performance |
| 87–90 min | Synthesis and questions |

# Google Colab: recommended setup

## Step 1 — Upload the package
Upload the folder contents, or upload this ZIP and extract it in Colab.

## Step 2 — Select GPU
**Runtime → Change runtime type → GPU**.

## Step 3 — Install

```bash
pip install -r requirements.txt
```

The package pins **Ultralytics 8.4.141** and uses the current YOLO26 tracking interface.

## Step 4 — Provide a short video
Preferred: upload a 20–60 second MP4 with people or traffic and rename it `input.mp4`.

You may also use the optional `yt-dlp` cell in the notebook with the public source shown by the Ultralytics tracking documentation.

## Step 5 — Inspect the first frame

```bash
python inspect_video.py --source input.mp4 --out outputs/first_frame.jpg
```

Open the image and verify that the default region and count line are sensible for your video.

## Step 6 — Edit the ROI if needed
Open `config.yaml`.

Coordinates are normalized to 0–1. Example:

```yaml
points:
  - [0.55, 0.25]
  - [0.95, 0.25]
  - [0.95, 0.95]
  - [0.55, 0.95]
```

`[0.55, 0.25]` means 55% of frame width and 25% of frame height.

## Step 7 — Smoke-test event logic

```bash
python smoke_test.py
```

Expected:

```text
ALL ANALYTICS SMOKE TESTS PASSED
```

This test does not need YOLO or a real video.

## Step 8 — Quick test on 200 frames

```bash
python run_demo.py --source input.mp4 --config config.yaml --output-dir outputs_quick --max-frames 200
```

Check:
- bounding boxes,
- class labels,
- track IDs,
- ROI position,
- count line,
- event messages.

## Step 9 — Full run

```bash
python run_demo.py --source input.mp4 --config config.yaml --output-dir outputs
```

Generated files:

- `outputs/annotated.mp4`
- `outputs/events.jsonl`
- `outputs/metrics.json`

## Step 10 — Generate incident report

```bash
python summarize_events.py --events outputs/events.jsonl --out-dir outputs
```

Generated:

- `outputs/incident_report.json`
- `outputs/incident_report.txt`

## Step 11 — Optional local-LLM summary

```bash
pip install -r requirements-llm.txt
python summarize_events.py \
  --events outputs/events.jsonl \
  --out-dir outputs \
  --llm \
  --llm-model Qwen/Qwen2.5-0.5B-Instruct
```

Generated:

- `outputs/llm_summary.txt`

The LLM is told to use only the structured event facts and not invent identity, intent, causes, threats, or unseen events.

# Local Linux / Windows / WSL

```bash
python -m venv .venv
```

Linux/macOS:

```bash
source .venv/bin/activate
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Then:

```bash
pip install -r requirements.txt
python smoke_test.py
python run_demo.py --source path/to/video.mp4 --config config.yaml
```

# Event definitions

## Restricted-zone entry
A `person` track changes from outside the configured polygon to inside it.

## Loitering
A tracked person remains continuously inside the ROI for at least `loiter_seconds`.

This is a simple classroom rule, not a production behavioral classifier.

## Line crossing
The center trajectory of a tracked object crosses the configured virtual line.

## Crowd threshold
The number of tracked people inside the ROI reaches the configured threshold. A cooldown prevents an alert every frame.

# Why tracking is essential

Detection asks:
> What objects are visible in this frame?

Tracking adds:
> Which detection corresponds to the same object across frames?

Without identity over time, we cannot reliably compute:
- dwell time,
- line crossing,
- repeated presence,
- object trajectory.

# Performance experiment

GPU:

```bash
python run_demo.py --source input.mp4 --config config.yaml --output-dir outputs_gpu
```

CPU:

```bash
python run_demo.py --source input.mp4 --config config_cpu.yaml --output-dir outputs_cpu
```

Compare `metrics.json`:
- `wall_fps`
- `avg_inference_ms`
- total event count

Important teaching point: detector latency is not the same as application latency. End-to-end processing also includes video decoding, tracking, analytics, drawing, and video encoding.

# Troubleshooting

## No CUDA
The demo still runs on CPU. In Colab, verify the runtime type.

## Track IDs missing
Keep `persist=True` and use a real video with detectable objects.

## No loitering event
Temporarily reduce:

```yaml
loiter_seconds: 2.0
```

## ROI is misplaced
Edit normalized ROI coordinates in `config.yaml`.

## MP4 will not play in browser
Convert:

```bash
ffmpeg -y -i outputs/annotated.mp4 -vcodec libx264 -pix_fmt yuv420p outputs/annotated_h264.mp4
```

# Current API basis

The code follows the current Ultralytics tracking form:

```python
model = YOLO("yolo26n.pt")
result = model.track(frame, persist=True, tracker="bytetrack.yaml")[0]
```

References:
- https://docs.ultralytics.com/modes/track/
- https://docs.ultralytics.com/reference/engine/model/
- https://docs.ultralytics.com/models/yolo26/
- https://pypi.org/project/ultralytics/8.4.141/
