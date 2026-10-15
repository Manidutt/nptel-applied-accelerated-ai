import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        class: { select: { id: true, name: true, code: true } },
        instructor: { select: { id: true, name: true, email: true } },
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { optionKey: 'asc' },
                },
              },
            },
          },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Role-based visibility and answer key protection
    const isOwnerOrAdmin = user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && quiz.instructorId === user.userId);

    // If student, sanitize privileged answers
    if (!isOwnerOrAdmin) {
      const sanitizedQuestions = quiz.questions.map((qq) => ({
        id: qq.id,
        orderIndex: qq.orderIndex,
        marks: qq.marks,
        negativeMarks: qq.negativeMarks,
        question: {
          id: qq.question.id,
          statement: qq.question.statement,
          type: qq.question.type,
          marks: qq.question.marks,
          negativeMarks: qq.question.negativeMarks,
          options: qq.question.options.map((opt) => ({
            id: opt.id,
            optionKey: opt.optionKey,
            text: opt.text,
            // isCorrect is omitted intentionally!
          })),
        },
      }));

      return NextResponse.json({
        quiz: {
          ...quiz,
          questions: sanitizedQuestions,
        },
        isOwner: false,
      });
    }

    return NextResponse.json({ quiz, isOwner: true });
  } catch (error: any) {
    console.error('Fetch quiz detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const isOwnerOrAdmin = user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && quiz.instructorId === user.userId);
    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: 'Forbidden. You do not own this quiz.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      instructions,
      subject,
      classId,
      status,
      durationMinutes,
      passingPercentage,
      allowedAttempts,
      negativeMarkingEnabled,
      partialCreditEnabled,
      integrityEnabled,
      requireFullscreen,
      tabSwitchThreshold,
      autoSubmitOnViolation,
      flagForReview,
      releaseResultsImmediately,
    } = body;

    const updated = await prisma.quiz.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(instructions !== undefined && { instructions: instructions?.trim() || null }),
        ...(subject !== undefined && { subject }),
        ...(classId !== undefined && { classId: classId || null }),
        ...(status !== undefined && { status }),
        ...(durationMinutes !== undefined && { durationMinutes: parseInt(durationMinutes, 10) }),
        ...(passingPercentage !== undefined && { passingPercentage: parseFloat(passingPercentage) }),
        ...(allowedAttempts !== undefined && { allowedAttempts: parseInt(allowedAttempts, 10) }),
        ...(negativeMarkingEnabled !== undefined && { negativeMarkingEnabled: Boolean(negativeMarkingEnabled) }),
        ...(partialCreditEnabled !== undefined && { partialCreditEnabled: Boolean(partialCreditEnabled) }),
        ...(integrityEnabled !== undefined && { integrityEnabled: Boolean(integrityEnabled) }),
        ...(requireFullscreen !== undefined && { requireFullscreen: Boolean(requireFullscreen) }),
        ...(tabSwitchThreshold !== undefined && { tabSwitchThreshold: parseInt(tabSwitchThreshold, 10) }),
        ...(autoSubmitOnViolation !== undefined && { autoSubmitOnViolation: Boolean(autoSubmitOnViolation) }),
        ...(flagForReview !== undefined && { flagForReview: Boolean(flagForReview) }),
        ...(releaseResultsImmediately !== undefined && { releaseResultsImmediately: Boolean(releaseResultsImmediately) }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'QUIZ_UPDATED',
        resourceType: 'Quiz',
        resourceId: updated.id,
        details: JSON.stringify({ status: updated.status, title: updated.title }),
      },
    });

    return NextResponse.json({ success: true, quiz: updated });
  } catch (error: any) {
    console.error('Update quiz error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: { _count: { select: { attempts: true } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const isOwnerOrAdmin = user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && quiz.instructorId === user.userId);
    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    // If attempts exist, archive instead of hard delete to preserve academic record integrity
    if (quiz._count.attempts > 0) {
      await prisma.quiz.update({
        where: { id: params.id },
        data: { status: 'ARCHIVED' },
      });
      return NextResponse.json({
        success: true,
        message: 'Quiz has existing student attempts and was safely archived rather than deleted.',
      });
    }

    await prisma.quiz.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: 'Quiz deleted successfully.' });
  } catch (error: any) {
    console.error('Delete quiz error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
