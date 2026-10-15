import { describe, it, expect } from 'vitest';
import { parseAndValidateMcqCsv } from '../lib/csv-parser';

describe('CSV Parser & MCQ Validator', () => {
  it('parses valid official template questions successfully', () => {
    const csvData = `question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation
"What is 2 + 2?",single_choice,"3","4","5","6",B,1,0,"Two plus two equals four."
"Which are prime numbers?",multiple_choice,"2","4","5","9","A|C",2,0,"Two and five are prime."
"The Earth orbits the Sun.",true_false,"True","False",,,,A,1,0,"Earth revolves around the Sun."`;

    const result = parseAndValidateMcqCsv(csvData);
    expect(result.globalErrors).toHaveLength(0);
    expect(result.totalRows).toBe(3);
    expect(result.validRowsCount).toBe(3);
    expect(result.invalidRowsCount).toBe(0);

    // Q1 Single Choice
    expect(result.questions[0].statement).toBe('What is 2 + 2?');
    expect(result.questions[0].type).toBe('single_choice');
    expect(result.questions[0].correctAnswer).toBe('B');
    expect(result.questions[0].marks).toBe(1);

    // Q2 Multiple Choice
    expect(result.questions[1].statement).toBe('Which are prime numbers?');
    expect(result.questions[1].type).toBe('multiple_choice');
    expect(result.questions[1].correctAnswer).toBe('A|C');
    expect(result.questions[1].options.filter((o) => o.isCorrect)).toHaveLength(2);

    // Q3 True False
    expect(result.questions[2].statement).toBe('The Earth orbits the Sun.');
    expect(result.questions[2].type).toBe('true_false');
    expect(result.questions[2].correctAnswer).toBe('A');
    expect(result.questions[2].options[0].text).toBe('True');
    expect(result.questions[2].options[1].text).toBe('False');
  });

  it('rejects CSV with missing required headers', () => {
    const invalidHeaderCsv = `question,type,opt_a,opt_b,answer\n"Test?",single_choice,"A","B",A`;
    const result = parseAndValidateMcqCsv(invalidHeaderCsv);

    expect(result.globalErrors.length).toBeGreaterThan(0);
    expect(result.globalErrors[0]).toContain('Missing required CSV headers');
    expect(result.validRowsCount).toBe(0);
  });

  it('detects invalid question type', () => {
    const csv = `question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation
"Test Q?",fill_in_the_blank,"A","B","C","D",A,1,0,""`;
    const result = parseAndValidateMcqCsv(csv);

    expect(result.questions[0].isValid).toBe(false);
    expect(result.questions[0].errors[0]).toContain('Invalid question type');
  });

  it('detects missing correct_answer or answer key pointing to missing option', () => {
    const csv = `question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation
"Single without D?",single_choice,"Option 1","Option 2",,,D,1,0,""`;
    const result = parseAndValidateMcqCsv(csv);

    expect(result.questions[0].isValid).toBe(false);
    expect(result.questions[0].errors.some((e) => e.includes('missing or empty option'))).toBe(true);
  });

  it('enforces at least 2 distinct correct answers for multiple_choice', () => {
    const csv = `question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation
"Multiple Choice?",multiple_choice,"Option 1","Option 2","Option 3","Option 4",A,2,0,""`;
    const result = parseAndValidateMcqCsv(csv);

    expect(result.questions[0].isValid).toBe(false);
    expect(result.questions[0].errors.some((e) => e.includes('at least 2 distinct correct options'))).toBe(true);
  });

  it('handles quotes, commas, and line breaks within fields', () => {
    const complexCsv = `question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation
"What is the output of:
console.log(""Hello, World!"");?",single_choice,"""Hello, World!""","null","undefined","Error",A,2,0.5,"Prints string with quotes and commas."`;

    const result = parseAndValidateMcqCsv(complexCsv);
    expect(result.validRowsCount).toBe(1);
    expect(result.questions[0].statement).toContain('console.log("Hello, World!");');
    expect(result.questions[0].options[0].text).toBe('"Hello, World!"');
  });
});
