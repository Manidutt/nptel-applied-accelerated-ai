import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

// Prevent spreadsheet formula injection (CSV Injection / CWE-1236)
function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Instructor access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');

    if (!quizId) {
      return NextResponse.json({ error: 'quizId parameter is required.' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        attempts: {
          where: { status: { in: ['SUBMITTED', 'AUTO_SUBMITTED', 'FLAGGED'] } },
          include: {
            user: true,
          },
          orderBy: { totalScore: 'desc' },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && quiz.instructorId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden. You do not own this quiz.' }, { status: 403 });
    }

    const rows = quiz.attempts.map((att) => {
      const minutes = Math.floor(att.timeSpentSeconds / 60);
      const seconds = att.timeSpentSeconds % 60;
      const formattedTime = `${minutes}m ${seconds}s`;

      return {
        student_id: sanitizeCsvValue(att.user.id),
        student_name: sanitizeCsvValue(att.user.name),
        email: sanitizeCsvValue(att.user.email),
        quiz_title: sanitizeCsvValue(quiz.title),
        attempt_number: att.attemptNumber,
        total_marks: att.maxScore,
        marks_obtained: att.totalScore,
        percentage: `${att.percentage.toFixed(2)}%`,
        correct_count: att.correctCount,
        incorrect_count: att.incorrectCount,
        unanswered_count: att.unansweredCount,
        time_taken: sanitizeCsvValue(formattedTime),
        submission_status: att.status,
        submitted_at: att.submittedAt ? new Date(att.submittedAt).toISOString() : '',
        integrity_event_count: att.integrityEventCount,
      };
    });

    const csvString = Papa.unparse(rows);
    const safeTitle = quiz.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Q_Rice_${safeTitle}_Results_${dateStr}.csv`;

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export CSV error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
