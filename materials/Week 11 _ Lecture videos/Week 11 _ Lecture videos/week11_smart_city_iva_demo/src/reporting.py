from collections import Counter
from pathlib import Path
import json
SEVERITY_ORDER={'high':3,'medium':2,'info':1,'low':0}

def load_events(path):
    p=Path(path)
    if not p.exists(): return []
    return [json.loads(x) for x in p.read_text(encoding='utf-8').splitlines() if x.strip()]

def build_incident_report(events):
    tc=Counter(e['event_type'] for e in events); sc=Counter(e['severity'] for e in events)
    highest='none' if not events else max((e.get('severity','info') for e in events), key=lambda s:SEVERITY_ORDER.get(s,0))
    first=min((e['timestamp_s'] for e in events),default=None); last=max((e['timestamp_s'] for e in events),default=None)
    high=[{'time_s':e['timestamp_s'],'event_type':e['event_type'],'message':e['message']} for e in events if e.get('severity')=='high'][:20]
    actions=[]
    if tc.get('restricted_zone_entry'): actions.append('Review restricted-zone entries and verify whether access was authorized.')
    if tc.get('loitering'): actions.append('Review dwell-time events and check track-ID persistence before escalation.')
    if tc.get('crowd_threshold'): actions.append('Review crowd-threshold intervals and ROI placement.')
    if tc.get('line_crossing'): actions.append('Validate line-crossing counts on a labeled clip before operational use.')
    if not actions: actions.append('No configured event rule fired; review ROI placement and detector confidence if events were expected.')
    return {'event_count':len(events),'event_type_counts':dict(tc),'severity_counts':dict(sc),'highest_severity':highest,
            'time_window_s':{'first':first,'last':last},'high_priority_events':high,'recommended_operator_actions':actions}

def deterministic_text(r):
    lines=['SMART-CITY IVA INCIDENT SUMMARY','='*35,f"Total events: {r['event_count']}",f"Highest severity: {r['highest_severity']}",'','Event counts:']
    if r['event_type_counts']:
        for k,v in sorted(r['event_type_counts'].items()): lines.append(f'  - {k}: {v}')
    else: lines.append('  - none')
    tw=r['time_window_s']
    if tw['first'] is not None: lines += ['',f"Observed event window: {tw['first']:.2f} s to {tw['last']:.2f} s"]
    if r['high_priority_events']:
        lines += ['','High-priority events:']
        for e in r['high_priority_events']: lines.append(f"  - {e['time_s']:.2f}s: {e['message']}")
    lines += ['','Recommended operator actions:']+[f'  - {a}' for a in r['recommended_operator_actions']]
    lines += ['','Note: this summarizes configured computer-vision rules; it is not a safety, legal, or security determination.']
    return '\n'.join(lines)

def llm_summary(report, model_id):
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    tok=AutoTokenizer.from_pretrained(model_id)
    model=AutoModelForCausalLM.from_pretrained(model_id,torch_dtype='auto',device_map='auto')
    messages=[
      {'role':'system','content':'You summarize machine-generated smart-city video analytics. Use only supplied structured facts. Do not invent identities, intent, causes, threats, or unseen events. Recommend human review.'},
      {'role':'user','content':'Create a concise operations-room summary with sections: Observed events, Priority, Recommended review.\n\n'+json.dumps(report,indent=2)}]
    prompt=tok.apply_chat_template(messages,tokenize=False,add_generation_prompt=True)
    inp=tok(prompt,return_tensors='pt').to(model.device)
    with torch.no_grad(): out=model.generate(**inp,max_new_tokens=240,do_sample=False)
    return tok.decode(out[0][inp['input_ids'].shape[1]:],skip_special_tokens=True).strip()
