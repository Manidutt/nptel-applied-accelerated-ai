import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { calculateAttemptScore, QuestionScoringItem } from '@/lib/scoring';

export async function POST(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        responses: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
    }

    if (attempt.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Idempotency: If already submitted, return the persisted result
    if (attempt.status === 'SUBMITTED' || attempt.status === 'AUTO_SUBMITTED' || attempt.status === 'FLAGGED') {
      return NextResponse.json({
        alreadySubmitted: true,
        attempt: {
          id: attempt.id,
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          isPassed: attempt.isPassed,
          submittedAt: attempt.submittedAt,
        },
        releaseResultsImmediately: attempt.quiz.releaseResultsImmediately,
      });
    }

    // Prepare scoring items
    const scoringItems: QuestionScoringItem[] = attempt.quiz.questions.map((qq) => {
      const resp = attempt.responses.find((r) => r.questionId === qq.questionId);
      const correctKeys = qq.question.options
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.optionKey);

      const selectedKeys = resp?.selectedKeys
        ? resp.selectedKeys.split('|').map((k) => k.trim())
        : [];

      return {
        questionId: qq.questionId,
        type: qq.question.type,
        marks: qq.marks,
        negativeMarks: qq.negativeMarks,
        correctOptionKeys: correctKeys,
        selectedOptionKeys: selectedKeys,
      };
    });

    const scoreSummary = calculateAttemptScore(scoringItems, {
      negativeMarkingEnabled: attempt.quiz.negativeMarkingEnabled,
      partialCreditEnabled: attempt.quiz.partialCreditEnabled,
      passingPercentage: attempt.quiz.passingPercentage,
    });

    const now = new Date();
    const startTimeMs = new Date(attempt.startedAt).getTime();
    const timeSpentSeconds = Math.max(0, Math.floor((now.getTime() - startTimeMs) / 1000));

    // Transactionally update responses and attempt
    await prisma.$transaction(async (tx) => {
      for (const qRes of scoreSummary.questionResults) {
        if (qRes.isAnswered) {
          await tx.studentResponse.updateMany({
            where: {
              attemptId: attempt.id,
              questionId: qRes.questionId,
            },
            data: {
              isCorrect: qRes.isCorrect,
              marksAwarded: qRes.marksAwarded,
            },
          });
        }
      }

      await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: attempt.isFlaggedForReview ? 'FLAGGED' : 'SUBMITTED',
          totalScore: scoreSummary.totalScore,
          maxScore: scoreSummary.maxScore,
          percentage: scoreSummary.percentage,
          isPassed: scoreSummary.isPassed,
          correctCount: scoreSummary.correctCount,
          incorrectCount: scoreSummary.incorrectCount,
          unansweredCount: scoreSummary.unansweredCount,
          timeSpentSeconds,
          submittedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: 'ATTEMPT_SUBMITTED',
          resourceType: 'QuizAttempt',
          resourceId: attempt.id,
          details: JSON.stringify({
            score: scoreSummary.totalScore,
            maxScore: scoreSummary.maxScore,
            percentage: scoreSummary.percentage,
            isPassed: scoreSummary.isPassed,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      scoreSummary: {
        totalScore: scoreSummary.totalScore,
        maxScore: scoreSummary.maxScore,
        percentage: scoreSummary.percentage,
        isPassed: scoreSummary.isPassed,
        correctCount: scoreSummary.correctCount,
        incorrectCount: scoreSummary.incorrectCount,
        unansweredCount: scoreSummary.unansweredCount,
        timeSpentSeconds,
      },
      releaseResultsImmediately: attempt.quiz.releaseResultsImmediately,
    });
  } catch (error: any) {
    console.error('Finalize attempt error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
