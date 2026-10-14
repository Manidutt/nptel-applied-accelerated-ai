import argparse, json
from pathlib import Path
from src.reporting import load_events, build_incident_report, deterministic_text, llm_summary

def main():
    p=argparse.ArgumentParser(); p.add_argument('--events',default='outputs/events.jsonl'); p.add_argument('--out-dir',default='outputs')
    p.add_argument('--llm',action='store_true'); p.add_argument('--llm-model',default='Qwen/Qwen2.5-0.5B-Instruct'); a=p.parse_args()
    out=Path(a.out_dir); out.mkdir(parents=True,exist_ok=True); report=build_incident_report(load_events(a.events))
    (out/'incident_report.json').write_text(json.dumps(report,indent=2)); text=deterministic_text(report)
    (out/'incident_report.txt').write_text(text+'\n'); print(text)
    if a.llm:
        print('\n'+'='*70+'\nLOCAL LLM SUMMARY\n'+'='*70)
        generated=llm_summary(report,a.llm_model); (out/'llm_summary.txt').write_text(generated+'\n'); print(generated)
if __name__=='__main__': main()
