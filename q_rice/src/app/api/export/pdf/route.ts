import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { generateStudentReportPdf, generateClassReportPdf } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'class'; // 'student' or 'class'

    if (type === 'student') {
      const attemptId = searchParams.get('attemptId');
      if (!attemptId) {
        return NextResponse.json({ error: 'attemptId parameter is required' }, { status: 400 });
      }

      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        include: {
          user: true,
          quiz: {
            include: {
              instructor: true,
              questions: {
                orderBy: { orderIndex: 'asc' },
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

      // Authorization check
      if (user.role === 'STUDENT' && attempt.userId !== user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const questionsData = attempt.quiz.questions.map((qq) => {
        const resp = attempt.responses.find((r) => r.questionId === qq.questionId);
        const correctOpt = qq.question.options
          .filter((o) => o.isCorrect)
          .map((o) => o.optionKey)
          .join('|');

        return {
          qNum: qq.orderIndex,
          statement: qq.question.statement,
          studentAnswer: resp?.selectedKeys || '',
          correctAnswer: correctOpt,
          isCorrect: resp?.isCorrect || false,
          marksAwarded: resp?.marksAwarded || 0,
          maxMarks: qq.marks,
          explanation: qq.question.explanation || '',
        };
      });

      const pdfBuffer = await generateStudentReportPdf({
        quizTitle: attempt.quiz.title,
        subject: attempt.quiz.subject,
        studentName: attempt.user.name,
        studentEmail: attempt.user.email,
        instructorName: attempt.quiz.instructor.name,
        attemptNumber: attempt.attemptNumber,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        correctCount: attempt.correctCount,
        incorrectCount: attempt.incorrectCount,
        unansweredCount: attempt.unansweredCount,
        timeSpentSeconds: attempt.timeSpentSeconds,
        integrityEventCount: attempt.integrityEventCount,
        submittedAt: attempt.submittedAt || new Date(),
        questions: questionsData,
      });

      const safeName = attempt.user.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Q_Rice_Report_${safeName}_Attempt${attempt.attemptNumber}.pdf`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: Class Performance Report
    const quizId = searchParams.get('quizId');
    if (!quizId) {
      return NextResponse.json({ error: 'quizId parameter is required' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        class: true,
        instructor: true,
        attempts: {
          where: { status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'FLAGGED'] } },
          include: { user: true },
          orderBy: { totalScore: 'desc' },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && quiz.instructorId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const scores = quiz.attempts.map((a) => a.totalScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = quiz.attempts.filter((a) => a.isPassed).length;
    const passPct = scores.length > 0 ? (passCount / scores.length) * 100 : 0;

    const classPdfBuffer = await generateClassReportPdf({
      quizTitle: quiz.title,
      subject: quiz.subject,
      className: quiz.class?.name || 'Class Cohort',
      instructorName: quiz.instructor.name,
      totalParticipants: quiz.attempts.length,
      completedAttempts: quiz.attempts.length,
      averageScore: avgScore,
      highestScore: highScore,
      lowestScore: lowScore,
      passPercentage: passPct,
      results: quiz.attempts.map((att) => ({
        studentName: att.user.name,
        email: att.user.email,
        score: att.totalScore,
        maxScore: att.maxScore,
        percentage: att.percentage,
        isPassed: att.isPassed,
        integrityViolations: att.integrityEventCount,
      })),
    });

    const safeTitle = quiz.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const filename = `Q_Rice_Class_Report_${safeTitle}.pdf`;

    return new NextResponse(classPdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export PDF error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
