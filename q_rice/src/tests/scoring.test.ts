import { describe, it, expect } from 'vitest';
import {
  scoreQuestionResponse,
  calculateAttemptScore,
  QuestionScoringItem,
  AttemptScoringPolicy,
} from '../lib/scoring';

describe('Scoring Engine', () => {
  const policy: AttemptScoringPolicy = {
    negativeMarkingEnabled: true,
    partialCreditEnabled: true,
    passingPercentage: 50.0,
  };

  it('awards full marks for correct single_choice answer', () => {
    const item: QuestionScoringItem = {
      questionId: 'q1',
      type: 'single_choice',
      marks: 2.0,
      negativeMarks: 0.5,
      correctOptionKeys: ['B'],
      selectedOptionKeys: ['B'],
    };

    const res = scoreQuestionResponse(item, policy);
    expect(res.isCorrect).toBe(true);
    expect(res.marksAwarded).toBe(2.0);
    expect(res.status).toBe('CORRECT');
  });

  it('deducts negative marks for incorrect single_choice answer when negative marking enabled', () => {
    const item: QuestionScoringItem = {
      questionId: 'q1',
      type: 'single_choice',
      marks: 2.0,
      negativeMarks: 0.5,
      correctOptionKeys: ['B'],
      selectedOptionKeys: ['A'],
    };

    const res = scoreQuestionResponse(item, policy);
    expect(res.isCorrect).toBe(false);
    expect(res.marksAwarded).toBe(-0.5);
    expect(res.status).toBe('INCORRECT');
  });

  it('awards 0 marks without penalty for unanswered questions', () => {
    const item: QuestionScoringItem = {
      questionId: 'q1',
      type: 'single_choice',
      marks: 2.0,
      negativeMarks: 0.5,
      correctOptionKeys: ['B'],
      selectedOptionKeys: [],
    };

    const res = scoreQuestionResponse(item, policy);
    expect(res.isAnswered).toBe(false);
    expect(res.marksAwarded).toBe(0);
    expect(res.status).toBe('UNANSWERED');
  });

  it('correctly calculates partial credit for multiple_choice when subset is correct', () => {
    const item: QuestionScoringItem = {
      questionId: 'q2',
      type: 'multiple_choice',
      marks: 4.0,
      negativeMarks: 1.0,
      correctOptionKeys: ['A', 'C'],
      selectedOptionKeys: ['A'], // Student chose 1 out of 2 correct
    };

    const res = scoreQuestionResponse(item, policy);
    expect(res.status).toBe('PARTIAL');
    expect(res.marksAwarded).toBe(2.0); // 4 * (1/2) = 2.0
  });

  it('penalizes multiple_choice if incorrect option is selected even if partial credit enabled', () => {
    const item: QuestionScoringItem = {
      questionId: 'q2',
      type: 'multiple_choice',
      marks: 4.0,
      negativeMarks: 1.0,
      correctOptionKeys: ['A', 'C'],
      selectedOptionKeys: ['A', 'B'], // 'B' is wrong
    };

    const res = scoreQuestionResponse(item, policy);
    expect(res.status).toBe('INCORRECT');
    expect(res.marksAwarded).toBe(-1.0); // negative penalty applied
  });

  it('calculates overall attempt summary, pass/fail status, and floors at 0', () => {
    const items: QuestionScoringItem[] = [
      {
        questionId: 'q1',
        type: 'single_choice',
        marks: 2.0,
        negativeMarks: 1.0,
        correctOptionKeys: ['A'],
        selectedOptionKeys: ['A'], // +2
      },
      {
        questionId: 'q2',
        type: 'single_choice',
        marks: 2.0,
        negativeMarks: 1.0,
        correctOptionKeys: ['B'],
        selectedOptionKeys: ['C'], // -1
      },
      {
        questionId: 'q3',
        type: 'true_false',
        marks: 2.0,
        negativeMarks: 0.5,
        correctOptionKeys: ['B'],
        selectedOptionKeys: [], // 0 (unanswered)
      },
    ];

    const summary = calculateAttemptScore(items, policy);
    expect(summary.maxScore).toBe(6.0);
    expect(summary.totalScore).toBe(1.0); // 2 - 1 + 0 = 1
    expect(summary.correctCount).toBe(1);
    expect(summary.incorrectCount).toBe(1);
    expect(summary.unansweredCount).toBe(1);
    expect(summary.percentage).toBeCloseTo(16.67, 1);
    expect(summary.isPassed).toBe(false); // 16.67% < 50%
  });
});
