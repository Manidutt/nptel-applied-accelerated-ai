import Papa from 'papaparse';

export interface ParsedOption {
  optionKey: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
}

export interface ParsedQuestionRow {
  rowNumber: number;
  statement: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  options: ParsedOption[];
  correctAnswer: string;
  marks: number;
  negativeMarks: number;
  explanation: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CsvImportResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  questions: ParsedQuestionRow[];
  globalErrors: string[];
  errorCsvContent?: string;
}

export const EXPECTED_HEADERS = [
  'question',
  'type',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'marks',
  'negative_marks',
  'explanation',
];

export function parseAndValidateMcqCsv(csvString: string): CsvImportResult {
  const globalErrors: string[] = [];
  
  if (!csvString || !csvString.trim()) {
    return {
      totalRows: 0,
      validRowsCount: 0,
      invalidRowsCount: 0,
      questions: [],
      globalErrors: ['The uploaded CSV file is empty.'],
    };
  }

  const parseResult = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parseResult.errors && parseResult.errors.length > 0) {
    for (const pe of parseResult.errors) {
      if (pe.code === 'TooManyFields' || pe.code === 'TooFewFields') {
        continue;
      }
      globalErrors.push(`CSV Syntax Error at line ${pe.row}: ${pe.message}`);
    }
  }

  // 1. Validate Headers
  const actualHeaders = parseResult.meta.fields || [];
  const missingHeaders = EXPECTED_HEADERS.filter(
    (eh) => !actualHeaders.includes(eh)
  );

  if (missingHeaders.length > 0) {
    globalErrors.push(
      `Missing required CSV headers: ${missingHeaders.join(', ')}. Expected: ${EXPECTED_HEADERS.join(', ')}`
    );
    return {
      totalRows: 0,
      validRowsCount: 0,
      invalidRowsCount: 0,
      questions: [],
      globalErrors,
    };
  }

  const questions: ParsedQuestionRow[] = [];
  const questionMap = new Map<string, number>(); // for duplicate detection

  parseResult.data.forEach((row, index) => {
    const rowNumber = index + 2; // Row 1 is header
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if entire row is empty
    const rawValues = Object.values(row).map((v) => String(v ?? '').trim());
    if (rawValues.every((v) => v === '')) {
      return; // Skip completely empty row
    }

    const questionText = String(row['question'] ?? '').trim();
    const typeRaw = String(row['type'] ?? '').trim().toLowerCase();
    const optA = String(row['option_a'] ?? '').trim();
    const optB = String(row['option_b'] ?? '').trim();
    const optC = String(row['option_c'] ?? '').trim();
    const optD = String(row['option_d'] ?? '').trim();
    let answerRaw = String(row['correct_answer'] ?? '').trim().toUpperCase();
    let marksRaw = String(row['marks'] ?? '').trim();
    let negMarksRaw = String(row['negative_marks'] ?? '').trim();
    let explanation = String(row['explanation'] ?? '').trim();

    // Auto-heal shifted columns for true_false if an extra comma occurred after option_d
    if (typeRaw === 'true_false' && !answerRaw && ['A', 'B'].includes(marksRaw)) {
      answerRaw = marksRaw;
      marksRaw = negMarksRaw;
      negMarksRaw = explanation;
      const extra = (row as any)['__parsed_extra'];
      explanation = Array.isArray(extra) ? String(extra[0] ?? '').trim() : '';
    }

    // 2. Validate Question Text
    if (!questionText) {
      errors.push('Question statement is required and cannot be empty.');
    } else {
      const normalizedQ = questionText.toLowerCase();
      if (questionMap.has(normalizedQ)) {
        warnings.push(`Potential duplicate question (similar to row ${questionMap.get(normalizedQ)}).`);
      } else {
        questionMap.set(normalizedQ, rowNumber);
      }
    }

    // 3. Validate Type
    let validatedType: 'single_choice' | 'multiple_choice' | 'true_false' = 'single_choice';
    if (!['single_choice', 'multiple_choice', 'true_false'].includes(typeRaw)) {
      errors.push(
        `Invalid question type "${typeRaw}". Must be one of: single_choice, multiple_choice, true_false.`
      );
    } else {
      validatedType = typeRaw as any;
    }

    // 4. Validate Marks & Negative Marks
    const marks = parseFloat(marksRaw);
    if (isNaN(marks) || marks <= 0) {
      errors.push(`Marks must be a positive number greater than 0. Received: "${marksRaw}"`);
    }

    let negativeMarks = 0;
    if (negMarksRaw !== '') {
      const neg = parseFloat(negMarksRaw);
      if (isNaN(neg) || neg < 0) {
        errors.push(`Negative marks cannot be negative or invalid number. Received: "${negMarksRaw}"`);
      } else {
        negativeMarks = neg;
      }
    }

    // 5. Build & Validate Options and Answer Keys
    const parsedOptions: ParsedOption[] = [];
    const availableOptionKeys: string[] = [];

    if (validatedType === 'true_false') {
      // Must be option_a = True, option_b = False, option_c & d empty
      const isAValidTrue = optA.toLowerCase() === 'true';
      const isBValidFalse = optB.toLowerCase() === 'false';

      if (!isAValidTrue) {
        errors.push(`For true_false questions, option_a must be "True". Received: "${optA}"`);
      }
      if (!isBValidFalse) {
        errors.push(`For true_false questions, option_b must be "False". Received: "${optB}"`);
      }
      if (optC !== '' || optD !== '') {
        errors.push(`For true_false questions, option_c and option_d must be empty.`);
      }

      if (!['A', 'B'].includes(answerRaw)) {
        errors.push(
          `For true_false questions, correct_answer must be "A" (True) or "B" (False). Received: "${answerRaw}"`
        );
      }

      parsedOptions.push({ optionKey: 'A', text: 'True', isCorrect: answerRaw === 'A' });
      parsedOptions.push({ optionKey: 'B', text: 'False', isCorrect: answerRaw === 'B' });
    } else if (validatedType === 'single_choice') {
      // Must have at least option_a and option_b
      if (!optA) errors.push('option_a is required.');
      else {
        parsedOptions.push({ optionKey: 'A', text: optA, isCorrect: answerRaw === 'A' });
        availableOptionKeys.push('A');
      }

      if (!optB) errors.push('option_b is required.');
      else {
        parsedOptions.push({ optionKey: 'B', text: optB, isCorrect: answerRaw === 'B' });
        availableOptionKeys.push('B');
      }

      if (optC) {
        parsedOptions.push({ optionKey: 'C', text: optC, isCorrect: answerRaw === 'C' });
        availableOptionKeys.push('C');
      }
      if (optD) {
        parsedOptions.push({ optionKey: 'D', text: optD, isCorrect: answerRaw === 'D' });
        availableOptionKeys.push('D');
      }

      // Check single correct key
      if (!['A', 'B', 'C', 'D'].includes(answerRaw)) {
        errors.push(`correct_answer for single_choice must be A, B, C, or D. Received: "${answerRaw}"`);
      } else if (!availableOptionKeys.includes(answerRaw)) {
        errors.push(`correct_answer "${answerRaw}" refers to a missing or empty option.`);
      }
    } else if (validatedType === 'multiple_choice') {
      // Multiple choice with pipe separator
      if (!optA) errors.push('option_a is required.');
      else {
        availableOptionKeys.push('A');
      }
      if (!optB) errors.push('option_b is required.');
      else {
        availableOptionKeys.push('B');
      }
      if (optC) availableOptionKeys.push('C');
      if (optD) availableOptionKeys.push('D');

      const splitKeys = answerRaw
        .split('|')
        .map((k) => k.trim().toUpperCase())
        .filter(Boolean);

      const uniqueKeys = Array.from(new Set(splitKeys));

      if (uniqueKeys.length < 2) {
        errors.push(
          `correct_answer for multiple_choice must have at least 2 distinct correct options separated by "|" (e.g. A|C). Received: "${answerRaw}"`
        );
      }

      for (const k of uniqueKeys) {
        if (!['A', 'B', 'C', 'D'].includes(k)) {
          errors.push(`Invalid option key "${k}" in multiple_choice correct_answer.`);
        } else if (!availableOptionKeys.includes(k)) {
          errors.push(`correct_answer option "${k}" refers to a missing or empty option.`);
        }
      }

      if (optA) parsedOptions.push({ optionKey: 'A', text: optA, isCorrect: uniqueKeys.includes('A') });
      if (optB) parsedOptions.push({ optionKey: 'B', text: optB, isCorrect: uniqueKeys.includes('B') });
      if (optC) parsedOptions.push({ optionKey: 'C', text: optC, isCorrect: uniqueKeys.includes('C') });
      if (optD) parsedOptions.push({ optionKey: 'D', text: optD, isCorrect: uniqueKeys.includes('D') });
    }

    const isValid = errors.length === 0;

    questions.push({
      rowNumber,
      statement: questionText,
      type: validatedType,
      options: parsedOptions,
      correctAnswer: answerRaw,
      marks: isNaN(marks) ? 1.0 : marks,
      negativeMarks,
      explanation,
      isValid,
      errors,
      warnings,
    });
  });

  const validRowsCount = questions.filter((q) => q.isValid).length;
  const invalidRowsCount = questions.filter((q) => !q.isValid).length;

  // Generate downloadable error CSV if any rows failed
  let errorCsvContent: string | undefined;
  const failedRows = questions.filter((q) => !q.isValid);
  if (failedRows.length > 0) {
    const errorCsvData = failedRows.map((f) => ({
      row_number: f.rowNumber,
      question_preview: f.statement.slice(0, 50),
      question_type: f.type,
      validation_errors: f.errors.join('; '),
    }));
    errorCsvContent = Papa.unparse(errorCsvData);
  }

  return {
    totalRows: questions.length,
    validRowsCount,
    invalidRowsCount,
    questions,
    globalErrors,
    errorCsvContent,
  };
}
