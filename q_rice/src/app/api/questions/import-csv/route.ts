import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { parseAndValidateMcqCsv } from '@/lib/csv-parser';

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Instructor role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { csvContent, commit, quizId, bankId } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json({ error: 'CSV content string is required.' }, { status: 400 });
    }

    const parseResult = parseAndValidateMcqCsv(csvContent);

    // If global error (such as missing headers), return immediately
    if (parseResult.globalErrors.length > 0) {
      return NextResponse.json({
        success: false,
        preview: true,
        globalErrors: parseResult.globalErrors,
        totalRows: 0,
        validRowsCount: 0,
        invalidRowsCount: 0,
        questions: [],
      }, { status: 422 });
    }

    // If just preview mode, return the validation report
    if (!commit) {
      return NextResponse.json({
        success: true,
        preview: true,
        totalRows: parseResult.totalRows,
        validRowsCount: parseResult.validRowsCount,
        invalidRowsCount: parseResult.invalidRowsCount,
        questions: parseResult.questions,
        errorCsvContent: parseResult.errorCsvContent,
      });
    }

    // Commit mode: persist valid questions into database
    const validQuestions = parseResult.questions.filter((q) => q.isValid);

    if (validQuestions.length === 0) {
      return NextResponse.json({
        error: 'No valid questions found to import.',
        totalRows: parseResult.totalRows,
        invalidRowsCount: parseResult.invalidRowsCount,
      }, { status: 400 });
    }

    let createdQuestionsCount = 0;

    await prisma.$transaction(async (tx) => {
      // Find current max order index if quizId provided
      let currentOrderIndex = 0;
      if (quizId) {
        const lastQuizQ = await tx.quizQuestion.findFirst({
          where: { quizId },
          orderBy: { orderIndex: 'desc' },
        });
        currentOrderIndex = lastQuizQ ? lastQuizQ.orderIndex : 0;
      }

      for (const q of validQuestions) {
        const newQ = await tx.question.create({
          data: {
            instructorId: user.userId,
            bankId: bankId || null,
            statement: q.statement,
            type: q.type,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            explanation: q.explanation || null,
            options: {
              create: q.options.map((opt) => ({
                optionKey: opt.optionKey,
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
            },
          },
        });

        createdQuestionsCount++;

        // If target quizId is given, link to quiz
        if (quizId) {
          currentOrderIndex++;
          await tx.quizQuestion.create({
            data: {
              quizId,
              questionId: newQ.id,
              orderIndex: currentOrderIndex,
              marks: q.marks,
              negativeMarks: q.negativeMarks,
            },
          });
        }
      }

      // If quizId provided, update totalMarks on quiz
      if (quizId) {
        const allQuizQs = await tx.quizQuestion.findMany({ where: { quizId } });
        const newTotal = allQuizQs.reduce((sum, item) => sum + item.marks, 0);
        await tx.quiz.update({
          where: { id: quizId },
          data: { totalMarks: newTotal },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: 'CSV_IMPORTED',
          resourceType: quizId ? 'Quiz' : 'QuestionBank',
          resourceId: quizId || bankId || 'GLOBAL',
          details: JSON.stringify({
            importedCount: createdQuestionsCount,
            totalRows: parseResult.totalRows,
            invalidRowsCount: parseResult.invalidRowsCount,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      committed: true,
      importedCount: createdQuestionsCount,
      skippedCount: parseResult.invalidRowsCount,
      totalRows: parseResult.totalRows,
      errorCsvContent: parseResult.errorCsvContent,
    });
  } catch (error: any) {
    console.error('Import CSV error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
