from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple, Any
import numpy as np
import cv2

@dataclass
class TrackObservation:
    track_id: int
    class_name: str
    confidence: float
    xyxy: Tuple[float, float, float, float]

    @property
    def center(self):
        x1, y1, x2, y2 = self.xyxy
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

@dataclass
class Event:
    timestamp_s: float
    frame_index: int
    event_type: str
    severity: str
    message: str
    track_id: int | None = None
    class_name: str | None = None
    confidence: float | None = None
    zone: str | None = None
    line: str | None = None
    count: int | None = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

def normalized_points(points, width, height):
    return np.asarray([[int(round(x * width)), int(round(y * height))] for x, y in points], dtype=np.int32)

def point_in_polygon(point, polygon_px):
    return cv2.pointPolygonTest(polygon_px, point, False) >= 0

def _orientation(a, b, c):
    val = (b[1]-a[1])*(c[0]-b[0]) - (b[0]-a[0])*(c[1]-b[1])
    if abs(val) < 1e-9:
        return 0
    return 1 if val > 0 else 2

def _on_segment(a, b, c):
    return min(a[0],c[0]) <= b[0] <= max(a[0],c[0]) and min(a[1],c[1]) <= b[1] <= max(a[1],c[1])

def segments_intersect(p1, p2, q1, q2):
    o1, o2 = _orientation(p1,p2,q1), _orientation(p1,p2,q2)
    o3, o4 = _orientation(q1,q2,p1), _orientation(q1,q2,p2)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and _on_segment(p1,q1,p2): return True
    if o2 == 0 and _on_segment(p1,q2,p2): return True
    if o3 == 0 and _on_segment(q1,p1,q2): return True
    if o4 == 0 and _on_segment(q1,p2,q2): return True
    return False

class AnalyticsEngine:
    """Deterministic classroom IVA event engine."""
    def __init__(self, cfg):
        self.cfg = cfg
        self.was_inside = {}
        self.zone_enter_time = {}
        self.loiter_emitted = set()
        self.prev_center = {}
        self.last_seen = {}
        self.crossed_tracks = set()
        self.last_crowd_event_s = -1e9

    def process(self, tracks: List[TrackObservation], timestamp_s, frame_index, frame_shape):
        h, w = frame_shape[:2]
        events = []
        zcfg = self.cfg['restricted_zone']
        zone_poly = normalized_points(zcfg['points'], w, h) if zcfg['enabled'] else None
        lcfg = self.cfg['count_line']
        if lcfg['enabled']:
            lp1 = (lcfg['p1'][0]*w, lcfg['p1'][1]*h)
            lp2 = (lcfg['p2'][0]*w, lcfg['p2'][1]*h)
        else:
            lp1 = lp2 = None
        people_inside = []

        for tr in tracks:
            tid, center = tr.track_id, tr.center
            self.last_seen[tid] = timestamp_s

            if zone_poly is not None and tr.class_name in zcfg['classes']:
                inside = point_in_polygon(center, zone_poly)
                if inside and not self.was_inside.get(tid, False):
                    self.zone_enter_time[tid] = timestamp_s
                    self.loiter_emitted.discard(tid)
                    events.append(Event(timestamp_s, frame_index, 'restricted_zone_entry', 'high',
                        f"{tr.class_name.title()} track {tid} entered {zcfg['name']}.", tid,
                        tr.class_name, round(float(tr.confidence),4), zone=zcfg['name']))
                if inside:
                    people_inside.append(tid)
                    start = self.zone_enter_time.setdefault(tid, timestamp_s)
                    if timestamp_s - start >= float(self.cfg['loiter_seconds']) and tid not in self.loiter_emitted:
                        self.loiter_emitted.add(tid)
                        events.append(Event(timestamp_s, frame_index, 'loitering', 'medium',
                            f"{tr.class_name.title()} track {tid} remained in {zcfg['name']} for at least {self.cfg['loiter_seconds']:.1f} s.",
                            tid, tr.class_name, round(float(tr.confidence),4), zone=zcfg['name']))
                else:
                    self.zone_enter_time.pop(tid, None)
                self.was_inside[tid] = inside

            if lcfg['enabled'] and tr.class_name in lcfg['classes']:
                prev = self.prev_center.get(tid)
                if prev is not None and tid not in self.crossed_tracks and segments_intersect(prev, center, lp1, lp2):
                    self.crossed_tracks.add(tid)
                    events.append(Event(timestamp_s, frame_index, 'line_crossing', 'info',
                        f"{tr.class_name.title()} track {tid} crossed {lcfg['name']}.", tid,
                        tr.class_name, round(float(tr.confidence),4), line=lcfg['name']))
            self.prev_center[tid] = center

        threshold = int(self.cfg['crowd_threshold'])
        if len(people_inside) >= threshold and timestamp_s - self.last_crowd_event_s >= float(self.cfg['crowd_cooldown_seconds']):
            self.last_crowd_event_s = timestamp_s
            events.append(Event(timestamp_s, frame_index, 'crowd_threshold', 'medium',
                f"Crowd threshold reached in {zcfg['name']}: {len(people_inside)} tracked people.",
                zone=zcfg['name'], count=len(people_inside)))

        stale_after = float(self.cfg['stale_track_seconds'])
        stale = [tid for tid,last in self.last_seen.items() if timestamp_s-last > stale_after]
        for tid in stale:
            self.last_seen.pop(tid,None); self.prev_center.pop(tid,None)
            self.was_inside.pop(tid,None); self.zone_enter_time.pop(tid,None)
        return events
