import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        class: { select: { name: true, code: true } },
        instructor: { select: { id: true, name: true, email: true } },
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            question: {
              include: { options: true },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const isOwnerOrAdmin = user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && quiz.instructorId === user.userId);
    if (!isOwnerOrAdmin && user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all completed/submitted attempts for this quiz
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: quiz.id,
        status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'FLAGGED'] },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        responses: true,
      },
      orderBy: { totalScore: 'desc' },
    });

    // If caller is student, they can only see their own attempt results if released!
    if (user.role === 'STUDENT') {
      const myAttempt = attempts.find((a) => a.userId === user.userId);
      if (!myAttempt) {
        return NextResponse.json({ error: 'No attempt found for this user.' }, { status: 404 });
      }

      if (!quiz.releaseResultsImmediately) {
        return NextResponse.json({
          released: false,
          message: 'The instructor has not released the assessment results yet.',
        });
      }

      return NextResponse.json({
        released: true,
        quizTitle: quiz.title,
        attempt: myAttempt,
      });
    }

    // Instructor / Admin Analytics calculation
    const totalSubmissions = attempts.length;
    const scores = attempts.map((a) => a.totalScore);
    const percentages = attempts.map((a) => a.percentage);

    const averageScore =
      totalSubmissions > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / totalSubmissions) * 100) / 100
        : 0;

    const highestScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalSubmissions > 0 ? Math.min(...scores) : 0;

    // Median
    const sortedScores = [...scores].sort((a, b) => a - b);
    let medianScore = 0;
    if (totalSubmissions > 0) {
      const mid = Math.floor(totalSubmissions / 2);
      medianScore =
        totalSubmissions % 2 !== 0
          ? sortedScores[mid]
          : (sortedScores[mid - 1] + sortedScores[mid]) / 2;
    }

    const passCount = attempts.filter((a) => a.isPassed).length;
    const passPercentage =
      totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 10000) / 100 : 0;

    // Score distribution buckets: [0-20%, 21-40%, 41-60%, 61-80%, 81-100%]
    const scoreDistribution = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 },
    ];

    for (const p of percentages) {
      if (p <= 20) scoreDistribution[0].count++;
      else if (p <= 40) scoreDistribution[1].count++;
      else if (p <= 60) scoreDistribution[2].count++;
      else if (p <= 80) scoreDistribution[3].count++;
      else scoreDistribution[4].count++;
    }

    // Question-level correctness analysis
    const questionAnalysis = quiz.questions.map((qq) => {
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      for (const att of attempts) {
        const resp = att.responses.find((r) => r.questionId === qq.questionId);
        if (!resp || !resp.selectedKeys) {
          unanswered++;
        } else if (resp.isCorrect) {
          correct++;
        } else {
          incorrect++;
        }
      }

      const totalResponses = correct + incorrect + unanswered;
      const correctnessRate =
        totalResponses > 0 ? Math.round((correct / totalResponses) * 10000) / 100 : 0;

      return {
        questionId: qq.question.id,
        orderIndex: qq.orderIndex,
        statement: qq.question.statement,
        type: qq.question.type,
        marks: qq.marks,
        correctCount: correct,
        incorrectCount: incorrect,
        unansweredCount: unanswered,
        correctnessRate,
      };
    });

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        subject: quiz.subject,
        className: quiz.class?.name || 'Open Enrollment',
        instructorName: quiz.instructor.name,
        totalMarks: quiz.totalMarks,
        passingPercentage: quiz.passingPercentage,
      },
      stats: {
        totalSubmissions,
        averageScore,
        medianScore,
        highestScore,
        lowestScore,
        passPercentage,
        scoreDistribution,
      },
      questionAnalysis,
      attempts: attempts.map((a) => ({
        id: a.id,
        studentId: a.user.id,
        studentName: a.user.name,
        email: a.user.email,
        totalScore: a.totalScore,
        maxScore: a.maxScore,
        percentage: a.percentage,
        isPassed: a.isPassed,
        correctCount: a.correctCount,
        incorrectCount: a.incorrectCount,
        unansweredCount: a.unansweredCount,
        timeSpentSeconds: a.timeSpentSeconds,
        integrityEventCount: a.integrityEventCount,
        isFlaggedForReview: a.isFlaggedForReview,
        status: a.status,
        submittedAt: a.submittedAt,
      })),
    });
  } catch (error: any) {
    console.error('Fetch results error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
