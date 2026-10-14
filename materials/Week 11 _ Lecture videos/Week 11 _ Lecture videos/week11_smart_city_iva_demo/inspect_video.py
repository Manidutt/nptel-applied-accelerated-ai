import argparse
from pathlib import Path
import cv2
p=argparse.ArgumentParser(); p.add_argument('--source',required=True); p.add_argument('--out',default='outputs/first_frame.jpg'); a=p.parse_args()
src=int(a.source) if a.source.isdigit() else a.source; cap=cv2.VideoCapture(src); ok,frame=cap.read(); cap.release()
if not ok: raise RuntimeError('Could not read first frame.')
out=Path(a.out); out.parent.mkdir(parents=True,exist_ok=True); cv2.imwrite(str(out),frame)
print('Saved:',out); print('Frame size:',frame.shape[1],'x',frame.shape[0])
