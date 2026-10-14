# Student Handout — Smart-City IVA

## Goal
Turn a video stream into machine-readable events.

## Tasks
1. Run YOLO26n tracking on a short video.
2. Record frames, device, wall FPS, and average inference latency.
3. Move the restricted-zone polygon so that at least one person enters it.
4. Set `loiter_seconds` so that at least one dwell event occurs.
5. Move the virtual line so that a person or vehicle crosses it.
6. Inspect `events.jsonl` and identify fields produced by detector, tracker, and event engine.
7. Generate the deterministic incident report.
8. Optional: generate the local-LLM summary and check for unsupported claims.

## Discussion questions
1. Why does loitering require tracking?
2. How can track-ID switches create false events?
3. Why must the ROI be calibrated to the camera?
4. Why is detector FPS different from application FPS?
5. Why is the LLM safer as a summarizer of structured facts than as the primary event detector?
6. What ground truth would be needed to evaluate each event rule?
