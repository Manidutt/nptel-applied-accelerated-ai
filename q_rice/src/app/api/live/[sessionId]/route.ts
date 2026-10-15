import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await prisma.quizSession.findUnique({
      where: { id: params.sessionId },
      include: {
        quiz: {
          include: {
            instructor: { select: { id: true, name: true, email: true } },
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                question: {
                  include: {
                    options: { orderBy: { optionKey: 'asc' } },
                  },
                },
              },
            },
          },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isInstructor = user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && session.quiz.instructorId === user.userId);

    // If student, sanitize privileged answers
    const questions = session.quiz.questions.map((qq) => ({
      quizQuestionId: qq.id,
      questionId: qq.question.id,
      orderIndex: qq.orderIndex,
      marks: qq.marks,
      negativeMarks: qq.negativeMarks,
      statement: qq.question.statement,
      type: qq.question.type,
      explanation: isInstructor ? qq.question.explanation : null,
      options: qq.question.options.map((opt) => ({
        id: opt.id,
        optionKey: opt.optionKey,
        text: opt.text,
        isCorrect: isInstructor ? opt.isCorrect : undefined,
      })),
    }));

    return NextResponse.json({
      session: {
        id: session.id,
        sessionCode: session.sessionCode,
        mode: session.mode,
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        startedAt: session.startedAt,
      },
      quiz: {
        id: session.quiz.id,
        title: session.quiz.title,
        subject: session.quiz.subject,
        durationMinutes: session.quiz.durationMinutes,
        instructorName: session.quiz.instructor.name,
        integritySettings: {
          integrityEnabled: session.quiz.integrityEnabled,
          requireFullscreen: session.quiz.requireFullscreen,
          tabSwitchThreshold: session.quiz.tabSwitchThreshold,
        },
      },
      questions,
      participants: session.participants.map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
        connectionStatus: p.connectionStatus,
        joinedAt: p.joinedAt,
      })),
      isInstructor,
    });
  } catch (error: any) {
    console.error('Fetch live session error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
