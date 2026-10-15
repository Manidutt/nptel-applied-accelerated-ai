import re, json
from pypdf import PdfReader

def get_clean_lines(pdf_path):
    reader = PdfReader(pdf_path)
    all_lines = []
    
    # Header noise lines to discard
    noise_exact = {
        'Indian Ins', 'titut', 'e of T', 'echnology Guw', 'aha', 'ti',
        'Indian', 'Guwahati', 'NPTEL', 'Online', 'Certification', 'Course',
        'Applied', 'Accelerated', 'Artificial', 'Intelligence', 'Architecture',
        'Detailed Solution'
    }
    
    for page in reader.pages:
        raw_text = page.extract_text()
        for line in raw_text.split('\n'):
            s = line.strip()
            if not s:
                continue
            if s in noise_exact:
                continue
            # Regex patterns for combined header lines
            if re.match(r'^Indian\s+Instit?u?t?e?\s+of\s+Technology\s+Guwahati$', s, re.I):
                continue
            if re.match(r'^NPTEL\s+Online\s+Certification\s+Course$', s, re.I):
                continue
            if re.match(r'^Applied\s+Accelerated\s+Artificial\s+(?:Intelligence|Architecture)$', s, re.I):
                continue
            if re.match(r'^Assignment\s*\d+\s*:?\s*Detailed\s+Solution$', s, re.I):
                continue
            all_lines.append(s)
            
    return all_lines

def parse_week(w, pdf_path):
    lines = get_clean_lines(pdf_path)
    full_text = '\n'.join(lines)
    
    # Split into question blocks
    # Match: Question 1:, Question 1, Q1., Question1., Question  1:
    q_matches = list(re.finditer(r'(?:(?:Question|Q)\s*(\d+)[:.]?)', full_text, re.I))
    
    questions = []
    for idx in range(len(q_matches)):
        start = q_matches[idx].start()
        end = q_matches[idx+1].start() if idx+1 < len(q_matches) else len(full_text)
        block = full_text[start:end].strip()
        q_num = int(q_matches[idx].group(1))
        
        # Split block: Answer and Explanation
        # Match "Correct Answer:" or "Answer:"
        ans_m = re.search(r'(?:Correct\s+Answer|Answer)\s*:\s*(.*?)(?=(?:Explanation|Detailed\s+Solution|$))', block, re.I | re.DOTALL)
        sol_m = re.search(r'(?:Explanation|Detailed\s+Solution)\s*:\s*(.*)', block, re.I | re.DOTALL)
        
        raw_ans = ans_m.group(1).strip() if ans_m else ''
        raw_sol = sol_m.group(1).strip() if sol_m else ''
        
        # Portion before Answer is Question + Options
        q_and_opts = block[:ans_m.start()].strip() if ans_m else block
        # Remove leading Question marker
        q_and_opts = re.sub(r'^(?:Question|Q)\s*\d+[:.]?\s*', '', q_and_opts, flags=re.I).strip()
        
        # Parse Options
        opts = []
        if '●' in q_and_opts:
            parts = q_and_opts.split('●')
            q_text = ' '.join(parts[0].split())
            opts_raw = parts[1:]
            for i, opt_str in enumerate(opts_raw):
                clean_opt = ' '.join(opt_str.split())
                # Check if starts with A), B), C), D) or A., B., C., D.
                m_opt = re.match(r'^([A-D])[\).\s]+(.*)', clean_opt)
                if m_opt:
                    key = m_opt.group(1).upper()
                    otext = m_opt.group(2).strip()
                else:
                    key = chr(ord('A') + i)
                    otext = clean_opt
                opts.append({'key': key, 'text': otext})
        else:
            # Check for Options:\nA) ... or A. ...
            m_opts_start = re.search(r'(?:Options\s*:\s*)?(?:^|\n)\s*([A-D])[\).]\s*', q_and_opts)
            if m_opts_start:
                q_text = ' '.join(q_and_opts[:m_opts_start.start()].split())
                opts_part = q_and_opts[m_opts_start.start():]
                matches = list(re.finditer(r'(?:^|\n)\s*([A-D])[\).]\s*(.*?)(?=(?:^|\n)\s*[A-D][\).]\s*|$)', opts_part, re.DOTALL))
                for m in matches:
                    opts.append({'key': m.group(1).upper(), 'text': ' '.join(m.group(2).split())})
            else:
                q_text = ' '.join(q_and_opts.split())
                opts = []
                
        # Resolve Answer Key and Answer Text
        ans_clean = ' '.join(raw_ans.split())
        ans_key = ''
        ans_text = ''
        
        # 1. Check if strictly single letter: 'A', 'B', 'C', 'D'
        if ans_clean in ['A', 'B', 'C', 'D']:
            ans_key = ans_clean
            matched_opt = next((o for o in opts if o['key'] == ans_key), None)
            ans_text = matched_opt['text'] if matched_opt else ans_clean
        # 2. Check if starts with letter followed by delimiter: A) ..., A. ..., A: ...
        elif re.match(r'^[A-D][\)\.\:\-]\s*', ans_clean):
            m_delim = re.match(r'^([A-D])[\)\.\:\-]\s*(.*)', ans_clean)
            ans_key = m_delim.group(1).upper()
            ans_text = m_delim.group(2).strip()
            if not ans_text:
                matched_opt = next((o for o in opts if o['key'] == ans_key), None)
                ans_text = matched_opt['text'] if matched_opt else ans_key
        # 3. Match against option texts
        else:
            ans_lower = ans_clean.lower()
            # Exact match
            for o in opts:
                if o['text'].lower() == ans_lower:
                    ans_key = o['key']
                    ans_text = o['text']
                    break
            # Substring match
            if not ans_key:
                for o in opts:
                    if ans_lower in o['text'].lower() or o['text'].lower() in ans_lower:
                        ans_key = o['key']
                        ans_text = o['text']
                        break
            # Word overlap match
            if not ans_key:
                ans_words = set(re.findall(r'\w+', ans_lower))
                best_score = 0
                best_opt = None
                for o in opts:
                    owords = set(re.findall(r'\w+', o['text'].lower()))
                    overlap = len(ans_words & owords)
                    if overlap > best_score:
                        best_score = overlap
                        best_opt = o
                if best_opt:
                    ans_key = best_opt['key']
                    ans_text = best_opt['text']
                    
        # Clean solution text
        clean_sol = ' '.join(raw_sol.split())
        
        # Clean question text leading colon if present
        if q_text.startswith(':'):
            q_text = q_text[1:].strip()
            
        questions.append({
            'week': w,
            'qNum': q_num,
            'question': q_text,
            'options': opts,
            'answer': ans_key,
            'answerText': ans_text,
            'explanation': clean_sol,
            'rawAns': ans_clean
        })
        
    return questions

all_parsed = []
for w in range(1, 11):
    path = f'assignments/Assignment_{w:02d}_Solution.pdf'
    qs = parse_week(w, path)
    all_parsed.extend(qs)
    print(f'Week {w}: {len(qs)} questions parsed.')

print(f'Total parsed questions: {len(all_parsed)}')

# Validate every single question has options and answer
invalid = []
for q in all_parsed:
    if len(q['options']) < 2:
        invalid.append((q['week'], q['qNum'], 'options < 2'))
    if q['answer'] not in ['A', 'B', 'C', 'D']:
        invalid.append((q['week'], q['qNum'], 'invalid answer key', q['answer'], q['rawAns']))
    if not q['explanation']:
        invalid.append((q['week'], q['qNum'], 'empty explanation'))

print(f'Invalid questions: {len(invalid)}')
if invalid:
    for inv in invalid:
        print(inv)
