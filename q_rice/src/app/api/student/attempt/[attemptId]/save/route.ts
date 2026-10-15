import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

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
      include: { quiz: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json({
        error: 'This attempt is already submitted or closed. Answers cannot be modified.',
      }, { status: 400 });
    }

    // Check server deadline
    const startTimeMs = new Date(attempt.startedAt).getTime();
    const durationMs = attempt.quiz.durationMinutes * 60 * 1000;
    if (Date.now() > startTimeMs + durationMs + 10000) {
      // 10s grace period for network transit
      return NextResponse.json({
        error: 'The examination time limit has expired. Responses can no longer be saved.',
      }, { status: 400 });
    }

    const body = await req.json();
    const { questionId, selectedKeys, isFlagged } = body;

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required.' }, { status: 400 });
    }

    const response = await prisma.studentResponse.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId,
        },
      },
      update: {
        selectedKeys: selectedKeys !== undefined ? String(selectedKeys).trim().toUpperCase() : '',
        ...(isFlagged !== undefined && { isFlagged: Boolean(isFlagged) }),
        answeredAt: new Date(),
      },
      create: {
        attemptId: attempt.id,
        questionId,
        selectedKeys: selectedKeys !== undefined ? String(selectedKeys).trim().toUpperCase() : '',
        isFlagged: Boolean(isFlagged),
        answeredAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, savedAt: response.answeredAt });
  } catch (error: any) {
    console.error('Save response error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
