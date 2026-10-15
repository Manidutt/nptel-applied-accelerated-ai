import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function generateAccessCode(prefix = 'QRICE'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let whereClause: any = {};
    if (user.role === 'INSTRUCTOR') {
      whereClause.instructorId = user.userId;
    } else if (user.role === 'STUDENT') {
      whereClause.status = { in: ['PUBLISHED', 'ACTIVE'] };
    }

    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        class: { select: { id: true, name: true, code: true } },
        instructor: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            questions: true,
            attempts: true,
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ quizzes });
  } catch (error: any) {
    console.error('Fetch quizzes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden. Instructor access required.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      instructions,
      subject,
      classId,
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
      questions, // Array of question objects { statement, type, marks, negativeMarks, explanation, options: [{ key, text, isCorrect }] } or question IDs from bank
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Quiz title is required.' }, { status: 400 });
    }

    let uniqueAccessCode = generateAccessCode();
    while (await prisma.quiz.findUnique({ where: { accessCode: uniqueAccessCode } })) {
      uniqueAccessCode = generateAccessCode();
    }

    // Transactionally create quiz and associate questions
    const createdQuiz = await prisma.$transaction(async (tx) => {
      let computedTotalMarks = 0;

      const quiz = await tx.quiz.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          instructions: instructions?.trim() || null,
          subject: subject || 'General',
          instructorId: user.userId,
          classId: classId || null,
          status: 'DRAFT',
          accessCode: uniqueAccessCode,
          durationMinutes: parseInt(durationMinutes || '30', 10),
          passingPercentage: parseFloat(passingPercentage || '50.0'),
          allowedAttempts: parseInt(allowedAttempts || '1', 10),
          negativeMarkingEnabled: Boolean(negativeMarkingEnabled),
          partialCreditEnabled: Boolean(partialCreditEnabled),
          integrityEnabled: Boolean(integrityEnabled ?? true),
          requireFullscreen: Boolean(requireFullscreen),
          tabSwitchThreshold: parseInt(tabSwitchThreshold || '3', 10),
          autoSubmitOnViolation: Boolean(autoSubmitOnViolation),
          flagForReview: Boolean(flagForReview ?? true),
          releaseResultsImmediately: Boolean(releaseResultsImmediately ?? true),
        },
      });

      if (Array.isArray(questions) && questions.length > 0) {
        for (let idx = 0; idx < questions.length; idx++) {
          const q = questions[idx];
          let qId = q.id;

          // If question is being created inline:
          if (!qId && q.statement && Array.isArray(q.options)) {
            const newQ = await tx.question.create({
              data: {
                instructorId: user.userId,
                statement: q.statement,
                type: q.type || 'single_choice',
                marks: parseFloat(q.marks || '1.0'),
                negativeMarks: parseFloat(q.negativeMarks || '0.0'),
                explanation: q.explanation || null,
                options: {
                  create: q.options.map((opt: any) => ({
                    optionKey: opt.optionKey || opt.key,
                    text: opt.text,
                    isCorrect: Boolean(opt.isCorrect),
                  })),
                },
              },
            });
            qId = newQ.id;
          }

          const qMarks = parseFloat(q.marks || '1.0');
          const qNegMarks = parseFloat(q.negativeMarks || '0.0');
          computedTotalMarks += qMarks;

          await tx.quizQuestion.create({
            data: {
              quizId: quiz.id,
              questionId: qId,
              orderIndex: idx + 1,
              marks: qMarks,
              negativeMarks: qNegMarks,
            },
          });
        }

        // Update totalMarks on quiz
        await tx.quiz.update({
          where: { id: quiz.id },
          data: { totalMarks: computedTotalMarks },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: 'QUIZ_CREATED',
          resourceType: 'Quiz',
          resourceId: quiz.id,
          details: JSON.stringify({ title: quiz.title, accessCode: quiz.accessCode }),
        },
      });

      return quiz;
    });

    return NextResponse.json({ success: true, quiz: createdQuiz }, { status: 201 });
  } catch (error: any) {
    console.error('Create quiz error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
