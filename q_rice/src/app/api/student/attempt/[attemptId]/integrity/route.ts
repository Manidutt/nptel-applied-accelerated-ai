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
                  include: { options: true },
                },
              },
            },
          },
        },
        responses: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json({
        message: 'Attempt is already closed.',
        integrityEventCount: attempt.integrityEventCount,
      });
    }

    const body = await req.json();
    const eventType = body.eventType || 'TAB_SWITCH';
    const description = body.description || 'Focus lost from quiz window.';

    const newViolationCount = attempt.integrityEventCount + 1;

    // Log the integrity event
    await prisma.integrityEvent.create({
      data: {
        attemptId: attempt.id,
        eventType,
        description,
        violationNo: newViolationCount,
      },
    });

    const threshold = attempt.quiz.tabSwitchThreshold;
    const shouldAutoSubmit =
      attempt.quiz.autoSubmitOnViolation && newViolationCount >= threshold;

    if (shouldAutoSubmit) {
      // Auto-submit the attempt immediately
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

      await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'AUTO_SUBMITTED',
          isFlaggedForReview: true,
          integrityEventCount: newViolationCount,
          totalScore: scoreSummary.totalScore,
          maxScore: scoreSummary.maxScore,
          percentage: scoreSummary.percentage,
          isPassed: scoreSummary.isPassed,
          correctCount: scoreSummary.correctCount,
          incorrectCount: scoreSummary.incorrectCount,
          unansweredCount: scoreSummary.unansweredCount,
          submittedAt: new Date(),
        },
      });

      return NextResponse.json({
        autoSubmitted: true,
        violationNo: newViolationCount,
        threshold,
        message: `Maximum allowed integrity warnings (${threshold}) exceeded. Your assessment has been automatically submitted.`,
      });
    }

    // Flag for review if threshold reached but auto-submit is false
    const shouldFlag = newViolationCount >= threshold;

    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        integrityEventCount: newViolationCount,
        isFlaggedForReview: shouldFlag,
      },
    });

    return NextResponse.json({
      autoSubmitted: false,
      violationNo: newViolationCount,
      threshold,
      warning: `Integrity Alert #${newViolationCount}: Leaving the quiz tab or window is monitored and recorded by the instructor.`,
    });
  } catch (error: any) {
    console.error('Log integrity event error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
