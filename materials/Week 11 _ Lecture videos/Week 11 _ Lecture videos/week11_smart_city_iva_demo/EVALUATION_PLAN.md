# Evaluation and Experiments

## Detection/tracking quality
On a manually annotated short clip, measure detection precision/recall and track-ID switches.

## Event-level quality
For each event type, measure:
- true positives,
- false positives,
- false negatives,
- precision,
- recall,
- F1.

Allow a small temporal tolerance when matching predicted and ground-truth event times.

## System performance
Report:
- resolution,
- model,
- tracker,
- device,
- confidence threshold,
- number of frames,
- average detector inference time,
- end-to-end wall FPS,
- whether drawing/encoding was enabled.

## Useful ablations
1. CPU vs GPU.
2. Image size.
3. Confidence threshold.
4. Tracker choice.
5. Video encoding enabled vs disabled.
6. Event thresholds.
7. Sparse vs crowded scene.

## LLM summary evaluation
Check:
- factual consistency with JSON events,
- missing high-severity events,
- hallucinated events,
- readability,
- actionability.
