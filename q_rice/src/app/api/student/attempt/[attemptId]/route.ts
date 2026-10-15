import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
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
              orderBy: { orderIndex: 'asc' },
              include: {
                question: {
                  include: {
                    options: {
                      orderBy: { optionKey: 'asc' },
                      select: {
                        id: true,
                        optionKey: true,
                        text: true,
                        // Privileged isCorrect is omitted!
                      },
                    },
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

    // Verify student ownership (or admin/instructor)
    if (attempt.userId !== user.userId && user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Forbidden. This is not your attempt.' }, { status: 403 });
    }

    // Compute server deadline
    const startTimeMs = new Date(attempt.startedAt).getTime();
    const durationMs = attempt.quiz.durationMinutes * 60 * 1000;
    const deadlineMs = startTimeMs + durationMs;
    const remainingSeconds = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));

    // Auto-close if deadline expired and still in progress
    if (remainingSeconds <= 0 && attempt.status === 'IN_PROGRESS') {
      // Return deadline expired signal
    }

    const isCompleted = attempt.status !== 'IN_PROGRESS';
    const canViewAnswers = isCompleted && (attempt.quiz.releaseResultsImmediately || user.role === 'INSTRUCTOR' || user.role === 'ADMIN');

    // If student is allowed to view detailed answers/explanations, fetch them
    let detailedQuestionsMap: Record<string, { explanation?: string | null; correctKeys: string[]; options: any[] }> = {};
    if (canViewAnswers) {
      const fullQuestions = await prisma.question.findMany({
        where: { id: { in: attempt.quiz.questions.map(q => q.questionId) } },
        include: { options: true }
      });
      for (const fq of fullQuestions) {
        detailedQuestionsMap[fq.id] = {
          explanation: fq.explanation,
          correctKeys: fq.options.filter(o => o.isCorrect).map(o => o.optionKey),
          options: fq.options.map(o => ({
            id: o.id,
            optionKey: o.optionKey,
            text: o.text,
            isCorrect: o.isCorrect
          }))
        };
      }
    }

    const questions = attempt.quiz.questions.map((qq) => {
      const detailed = detailedQuestionsMap[qq.question.id];
      return {
        quizQuestionId: qq.id,
        questionId: qq.question.id,
        orderIndex: qq.orderIndex,
        marks: qq.marks,
        negativeMarks: qq.negativeMarks,
        statement: qq.question.statement,
        type: qq.question.type,
        options: detailed ? detailed.options : qq.question.options,
        ...(detailed && {
          explanation: detailed.explanation,
          correctKeys: detailed.correctKeys,
        }),
      };
    });

    const responsesMap: Record<string, { selectedKeys: string; isFlagged: boolean; isCorrect?: boolean | null; marksAwarded?: number | null }> = {};
    for (const r of attempt.responses) {
      responsesMap[r.questionId] = {
        selectedKeys: r.selectedKeys,
        isFlagged: r.isFlagged,
        ...(canViewAnswers && {
          isCorrect: r.isCorrect,
          marksAwarded: r.marksAwarded,
        }),
      };
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        durationMinutes: attempt.quiz.durationMinutes,
        deadlineMs,
        remainingSeconds,
        integrityEventCount: attempt.integrityEventCount,
        ...(isCompleted && {
          totalScore: attempt.totalScore,
          maxScore: attempt.maxScore,
          percentage: attempt.percentage,
          isPassed: attempt.isPassed,
          correctCount: attempt.correctCount,
          incorrectCount: attempt.incorrectCount,
          unansweredCount: attempt.unansweredCount,
          submittedAt: attempt.submittedAt,
          isFlaggedForReview: attempt.isFlaggedForReview,
          canViewAnswers,
        }),
      },
      quiz: {
        id: attempt.quiz.id,
        title: attempt.quiz.title,
        instructions: attempt.quiz.instructions,
        subject: attempt.quiz.subject,
        releaseResultsImmediately: attempt.quiz.releaseResultsImmediately,
        integritySettings: {
          integrityEnabled: attempt.quiz.integrityEnabled,
          requireFullscreen: attempt.quiz.requireFullscreen,
          tabSwitchThreshold: attempt.quiz.tabSwitchThreshold,
          autoSubmitOnViolation: attempt.quiz.autoSubmitOnViolation,
        },
      },
      questions,
      responses: responsesMap,
    });
  } catch (error: any) {
    console.error('Fetch attempt error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
