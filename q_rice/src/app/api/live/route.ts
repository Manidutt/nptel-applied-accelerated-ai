import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { quizId, mode } = body;

    if (!quizId) {
      return NextResponse.json({ error: 'quizId is required.' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    let code = generateSessionCode();
    while (await prisma.quizSession.findUnique({ where: { sessionCode: code } })) {
      code = generateSessionCode();
    }

    const session = await prisma.quizSession.create({
      data: {
        quizId: quiz.id,
        sessionCode: code,
        mode: mode || 'INSTRUCTOR_LED',
        status: 'WAITING',
        currentQuestionIndex: 0,
        startedAt: new Date(),
      },
    });

    // Also mark quiz as ACTIVE
    await prisma.quiz.update({
      where: { id: quiz.id },
      data: { status: 'ACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'LIVE_SESSION_STARTED',
        resourceType: 'QuizSession',
        resourceId: session.id,
        details: JSON.stringify({ sessionCode: code, mode: session.mode }),
      },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        mode: session.mode,
        status: session.status,
        totalQuestions: quiz.questions.length,
      },
    });
  } catch (error: any) {
    console.error('Create live session error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sessions = await prisma.quizSession.findMany({
      where: user.role === 'ADMIN' ? {} : { quiz: { instructorId: user.userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            subject: true,
            accessCode: true,
            totalMarks: true,
            durationMinutes: true,
            _count: { select: { questions: true } },
          },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: {
            participants: true,
            attempts: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error('Fetch sessions history error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
