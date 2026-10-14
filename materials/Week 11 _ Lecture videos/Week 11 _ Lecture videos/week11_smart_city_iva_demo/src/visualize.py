import cv2
from .events import normalized_points

def draw_scene(frame, analytics_cfg, counters=None, recent_event=None):
    h, w = frame.shape[:2]
    zcfg = analytics_cfg['restricted_zone']
    if zcfg['enabled']:
        poly = normalized_points(zcfg['points'], w, h)
        cv2.polylines(frame,[poly],True,(0,215,255),2)
        x,y = poly[0]
        cv2.putText(frame,zcfg['name'],(int(x),max(25,int(y)-8)),cv2.FONT_HERSHEY_SIMPLEX,0.65,(0,215,255),2,cv2.LINE_AA)
    lcfg = analytics_cfg['count_line']
    if lcfg['enabled']:
        p1=(int(lcfg['p1'][0]*w),int(lcfg['p1'][1]*h)); p2=(int(lcfg['p2'][0]*w),int(lcfg['p2'][1]*h))
        cv2.line(frame,p1,p2,(255,255,0),2)
        cv2.putText(frame,lcfg['name'],(p1[0],max(25,p1[1]-8)),cv2.FONT_HERSHEY_SIMPLEX,0.65,(255,255,0),2,cv2.LINE_AA)
    if counters:
        y=30
        for k,v in counters.items():
            cv2.putText(frame,f"{k}: {v}",(18,y),cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,255,255),2,cv2.LINE_AA); y+=28
    if recent_event:
        cv2.rectangle(frame,(8,h-50),(w-8,h-8),(20,20,20),-1)
        cv2.putText(frame,recent_event[:95],(18,h-20),cv2.FONT_HERSHEY_SIMPLEX,0.62,(0,255,255),2,cv2.LINE_AA)
    return frame
