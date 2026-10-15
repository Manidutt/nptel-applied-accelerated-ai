export interface QuestionScoringItem {
  questionId: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | string;
  marks: number;
  negativeMarks: number;
  correctOptionKeys: string[]; // e.g. ["B"] or ["A", "C"]
  selectedOptionKeys: string[]; // e.g. ["B"] or ["A", "C"] or [] for unanswered
}

export interface QuestionScoreResult {
  questionId: string;
  isAnswered: boolean;
  isCorrect: boolean;
  marksAwarded: number;
  status: 'CORRECT' | 'INCORRECT' | 'PARTIAL' | 'UNANSWERED';
}

export interface AttemptScoringPolicy {
  negativeMarkingEnabled: boolean;
  partialCreditEnabled: boolean;
  passingPercentage: number;
}

export interface AttemptScoreSummary {
  totalScore: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  questionResults: QuestionScoreResult[];
}

export function scoreQuestionResponse(
  item: QuestionScoringItem,
  policy: AttemptScoringPolicy
): QuestionScoreResult {
  const { marks, negativeMarks, correctOptionKeys, selectedOptionKeys, type } = item;
  const isAnswered = selectedOptionKeys && selectedOptionKeys.length > 0;

  // 1. Unanswered Question: Always 0 marks, no penalty
  if (!isAnswered) {
    return {
      questionId: item.questionId,
      isAnswered: false,
      isCorrect: false,
      marksAwarded: 0,
      status: 'UNANSWERED',
    };
  }

  const selectedSet = new Set(selectedOptionKeys.map((k) => k.toUpperCase().trim()));
  const correctSet = new Set(correctOptionKeys.map((k) => k.toUpperCase().trim()));

  // 2. Single Choice & True/False Questions
  if (type === 'single_choice' || type === 'true_false') {
    const selected = Array.from(selectedSet)[0];
    const correct = Array.from(correctSet)[0];

    if (selected === correct) {
      return {
        questionId: item.questionId,
        isAnswered: true,
        isCorrect: true,
        marksAwarded: marks,
        status: 'CORRECT',
      };
    } else {
      const penalty = policy.negativeMarkingEnabled ? negativeMarks : 0;
      return {
        questionId: item.questionId,
        isAnswered: true,
        isCorrect: false,
        marksAwarded: -penalty,
        status: 'INCORRECT',
      };
    }
  }

  // 3. Multiple Choice Questions
  if (type === 'multiple_choice') {
    let correctSelections = 0;
    let incorrectSelections = 0;

    for (const sel of selectedSet) {
      if (correctSet.has(sel)) {
        correctSelections++;
      } else {
        incorrectSelections++;
      }
    }

    const isExactMatch =
      correctSelections === correctSet.size && incorrectSelections === 0;

    if (isExactMatch) {
      return {
        questionId: item.questionId,
        isAnswered: true,
        isCorrect: true,
        marksAwarded: marks,
        status: 'CORRECT',
      };
    }

    // If partial credit is enabled
    if (policy.partialCreditEnabled) {
      // If the student selected any wrong option, no partial credit is awarded
      if (incorrectSelections > 0) {
        const penalty = policy.negativeMarkingEnabled ? negativeMarks : 0;
        return {
          questionId: item.questionId,
          isAnswered: true,
          isCorrect: false,
          marksAwarded: -penalty,
          status: 'INCORRECT',
        };
      } else if (correctSelections > 0) {
        // Only subset of correct options chosen, no wrong options
        const partialRatio = correctSelections / correctSet.size;
        const awarded = Math.round(marks * partialRatio * 100) / 100;
        return {
          questionId: item.questionId,
          isAnswered: true,
          isCorrect: false,
          marksAwarded: awarded,
          status: 'PARTIAL',
        };
      }
    }

    // Standard incorrect multiple choice
    const penalty = policy.negativeMarkingEnabled ? negativeMarks : 0;
    return {
      questionId: item.questionId,
      isAnswered: true,
      isCorrect: false,
      marksAwarded: -penalty,
      status: 'INCORRECT',
    };
  }

  return {
    questionId: item.questionId,
    isAnswered: false,
    isCorrect: false,
    marksAwarded: 0,
    status: 'UNANSWERED',
  };
}

export function calculateAttemptScore(
  items: QuestionScoringItem[],
  policy: AttemptScoringPolicy
): AttemptScoreSummary {
  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const questionResults: QuestionScoreResult[] = [];

  for (const item of items) {
    maxScore += item.marks;
    const res = scoreQuestionResponse(item, policy);
    questionResults.push(res);
    totalScore += res.marksAwarded;

    if (res.status === 'CORRECT') correctCount++;
    else if (res.status === 'UNANSWERED') unansweredCount++;
    else incorrectCount++; // Includes PARTIAL and INCORRECT
  }

  // Attempt score floor at 0 (cannot be negative)
  const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
  const percentage =
    maxScore > 0 ? Math.round((finalScore / maxScore) * 10000) / 100 : 0;
  const isPassed = percentage >= policy.passingPercentage;

  return {
    totalScore: finalScore,
    maxScore: Math.round(maxScore * 100) / 100,
    percentage,
    isPassed,
    correctCount,
    incorrectCount,
    unansweredCount,
    questionResults,
  };
}
