from src.events import AnalyticsEngine, TrackObservation
cfg={'restricted_zone':{'enabled':True,'name':'restricted_zone','points':[[0.5,0.1],[0.95,0.1],[0.95,0.95],[0.5,0.95]],'classes':['person']},
     'loiter_seconds':2.0,'count_line':{'enabled':True,'name':'main_line','p1':[0.0,0.5],'p2':[1.0,0.5],'classes':['person','car']},
     'crowd_threshold':2,'crowd_cooldown_seconds':5.0,'stale_track_seconds':3.0}
e=AnalyticsEngine(cfg); shape=(100,100,3)
assert not e.process([TrackObservation(1,'person',0.9,(10,20,20,30))],0.0,0,shape)
e1=e.process([TrackObservation(1,'person',0.9,(60,20,70,30))],0.5,1,shape); assert any(x.event_type=='restricted_zone_entry' for x in e1)
e2=e.process([TrackObservation(1,'person',0.9,(60,20,70,30)),TrackObservation(2,'person',0.9,(75,20,85,30))],1.0,2,shape)
assert any(x.event_type=='crowd_threshold' for x in e2)
e3=e.process([TrackObservation(1,'person',0.9,(60,20,70,30)),TrackObservation(2,'person',0.9,(75,20,85,30))],2.6,3,shape)
assert any(x.event_type=='loitering' and x.track_id==1 for x in e3)
e.process([TrackObservation(3,'car',0.9,(20,30,30,40))],3.0,4,shape)
e4=e.process([TrackObservation(3,'car',0.9,(20,60,30,70))],3.5,5,shape); assert any(x.event_type=='line_crossing' and x.track_id==3 for x in e4)
print('ALL ANALYTICS SMOKE TESTS PASSED')
