import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Please log in to join an assessment.' }, { status: 401 });
    }

    const body = await req.json();
    const code = (body.code || '').trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Please enter a valid Access Code or Live Session Code.' }, { status: 400 });
    }

    // 1. Check if it's an active Live Session code
    const liveSession = await prisma.quizSession.findUnique({
      where: { sessionCode: code },
      include: {
        quiz: {
          include: {
            instructor: { select: { name: true, email: true } },
            questions: true,
          },
        },
      },
    });

    if (liveSession) {
      // Check attempts
      const attemptsCount = await prisma.quizAttempt.count({
        where: { quizId: liveSession.quizId, userId: user.userId },
      });

      if (attemptsCount >= liveSession.quiz.allowedAttempts) {
        return NextResponse.json({
          error: `You have reached the maximum allowed attempts (${liveSession.quiz.allowedAttempts}) for this assessment.`,
        }, { status: 403 });
      }

      // Check if student already has an active attempt
      let activeAttempt = await prisma.quizAttempt.findFirst({
        where: {
          quizId: liveSession.quizId,
          userId: user.userId,
          status: 'IN_PROGRESS',
        },
      });

      if (!activeAttempt) {
        activeAttempt = await prisma.quizAttempt.create({
          data: {
            quizId: liveSession.quizId,
            sessionId: liveSession.id,
            userId: user.userId,
            attemptNumber: attemptsCount + 1,
            status: 'IN_PROGRESS',
            maxScore: liveSession.quiz.totalMarks,
          },
        });
      }

      return NextResponse.json({
        type: 'LIVE_SESSION',
        sessionId: liveSession.id,
        sessionCode: liveSession.sessionCode,
        quizId: liveSession.quizId,
        attemptId: activeAttempt.id,
        quizTitle: liveSession.quiz.title,
        instructorName: liveSession.quiz.instructor.name,
        mode: liveSession.mode,
        sessionStatus: liveSession.status,
      });
    }

    // 2. Check if it's a direct Quiz Access Code (Self-Paced / Standard Assessment)
    const quiz = await prisma.quiz.findUnique({
      where: { accessCode: code },
      include: {
        instructor: { select: { name: true, email: true } },
        questions: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({
        error: `Invalid access code "${code}". Please check the code and try again.`,
      }, { status: 404 });
    }

    if (quiz.status !== 'PUBLISHED' && quiz.status !== 'ACTIVE') {
      return NextResponse.json({
        error: `This assessment is currently ${quiz.status.toLowerCase()} and not accepting submissions.`,
      }, { status: 400 });
    }

    // Check attempts limit
    const attemptsCount = await prisma.quizAttempt.count({
      where: { quizId: quiz.id, userId: user.userId },
    });

    if (attemptsCount >= quiz.allowedAttempts) {
      return NextResponse.json({
        error: `You have already completed the maximum number of attempts (${quiz.allowedAttempts}) for this assessment.`,
      }, { status: 403 });
    }

    // Resume in-progress attempt if exists
    let attempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId: quiz.id,
        userId: user.userId,
        status: 'IN_PROGRESS',
      },
    });

    if (!attempt) {
      attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: user.userId,
          attemptNumber: attemptsCount + 1,
          status: 'IN_PROGRESS',
          maxScore: quiz.totalMarks,
        },
      });
    }

    return NextResponse.json({
      type: 'STANDARD_QUIZ',
      quizId: quiz.id,
      attemptId: attempt.id,
      quizTitle: quiz.title,
      instructions: quiz.instructions,
      durationMinutes: quiz.durationMinutes,
      totalQuestions: quiz.questions.length,
      instructorName: quiz.instructor.name,
      integritySettings: {
        integrityEnabled: quiz.integrityEnabled,
        requireFullscreen: quiz.requireFullscreen,
        tabSwitchThreshold: quiz.tabSwitchThreshold,
      },
    });
  } catch (error: any) {
    console.error('Student join error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
