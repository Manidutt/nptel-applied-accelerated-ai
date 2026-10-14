from __future__ import annotations
import argparse, json, time
from collections import Counter, deque
from pathlib import Path
import cv2, numpy as np, torch, yaml
from ultralytics import YOLO
from src.events import AnalyticsEngine, TrackObservation
from src.visualize import draw_scene

def parse_args():
    p=argparse.ArgumentParser(description='Week 11 Smart-City IVA demo')
    p.add_argument('--source',required=True)
    p.add_argument('--config',default='config.yaml')
    p.add_argument('--output-dir',default='outputs')
    p.add_argument('--max-frames',type=int,default=0)
    return p.parse_args()

def resolve_source(s): return int(s) if str(s).isdigit() else s

def choose_device(x):
    if x=='auto': return 0 if torch.cuda.is_available() else 'cpu'
    if isinstance(x,str) and x.isdigit(): return int(x)
    return x

def main():
    args=parse_args(); cfg=yaml.safe_load(Path(args.config).read_text())
    out=Path(args.output_dir); out.mkdir(parents=True,exist_ok=True)
    events_path=out/'events.jsonl'; video_path=out/'annotated.mp4'; metrics_path=out/'metrics.json'
    events_path.write_text('')
    mc=cfg['model']; device=choose_device(mc.get('device','auto'))
    print('='*70); print('WEEK 11 SMART-CITY IVA DEMO')
    print('Model:',mc['name'],' Tracker:',mc['tracker'],' Device:',device)
    if torch.cuda.is_available(): print('CUDA GPU:',torch.cuda.get_device_name(0))
    print('Source:',args.source); print('='*70)
    model=YOLO(mc['name'])
    cap=cv2.VideoCapture(resolve_source(args.source))
    if not cap.isOpened(): raise RuntimeError(f'Could not open source: {args.source}')
    fps=cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps<=1e-6 or np.isnan(fps): fps=25.0
    width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    writer=None
    if cfg['output'].get('save_video',True):
        writer=cv2.VideoWriter(str(video_path),cv2.VideoWriter_fourcc(*'mp4v'),fps,(width,height))
    engine=AnalyticsEngine(cfg['analytics']); counts=Counter(); recent=deque(maxlen=1)
    frame_idx=0; inference_ms=[]; start=time.perf_counter()
    while True:
        ok,frame=cap.read()
        if not ok: break
        if args.max_frames and frame_idx>=args.max_frames: break
        ts=frame_idx/fps
        result=model.track(frame,persist=True,tracker=mc['tracker'],conf=float(mc['conf']),iou=float(mc.get('iou',0.7)),
                           imgsz=int(mc.get('imgsz',640)),classes=mc.get('classes'),device=device,verbose=False)[0]
        if getattr(result,'speed',None) and result.speed.get('inference') is not None:
            inference_ms.append(float(result.speed['inference']))
        annotated=result.plot(labels=True,conf=cfg['output'].get('draw_confidence',True),boxes=True)
        tracks=[]; boxes=result.boxes
        if boxes is not None and boxes.id is not None:
            xyxy=boxes.xyxy.cpu().numpy(); ids=boxes.id.int().cpu().tolist(); classes=boxes.cls.int().cpu().tolist(); confs=boxes.conf.cpu().tolist()
            for box,tid,ci,cf in zip(xyxy,ids,classes,confs):
                tracks.append(TrackObservation(int(tid),str(result.names[int(ci)]),float(cf),tuple(float(v) for v in box)))
        events=engine.process(tracks,ts,frame_idx,frame.shape)
        if events:
            with events_path.open('a') as f:
                for ev in events:
                    f.write(json.dumps(ev.to_dict())+'\n'); counts[ev.event_type]+=1; recent.append(ev.message)
                    print(f'[{ts:7.2f}s] {ev.severity.upper():6s} {ev.event_type:24s} {ev.message}')
        annotated=draw_scene(annotated,cfg['analytics'],{'frame':frame_idx,'tracked':len(tracks),'events':sum(counts.values())},recent[-1] if recent else None)
        if writer is not None: writer.write(annotated)
        frame_idx+=1
    wall=time.perf_counter()-start; cap.release()
    if writer is not None: writer.release()
    metrics={'model':mc['name'],'tracker':mc['tracker'],'device':str(device),'cuda_available':bool(torch.cuda.is_available()),
             'frames_processed':frame_idx,'input_fps':fps,'wall_seconds':wall,'wall_fps':frame_idx/wall if wall else None,
             'avg_inference_ms':sum(inference_ms)/len(inference_ms) if inference_ms else None,'event_counts':dict(counts),
             'output_video':str(video_path) if writer is not None else None,'events_file':str(events_path)}
    metrics_path.write_text(json.dumps(metrics,indent=2)); print('\nDONE'); print(json.dumps(metrics,indent=2))

if __name__=='__main__': main()
