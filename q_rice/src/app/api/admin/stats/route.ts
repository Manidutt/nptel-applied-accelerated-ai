import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const [
      totalUsers,
      totalInstructors,
      totalStudents,
      totalQuizzes,
      totalQuestions,
      totalAttempts,
      activeSessions,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.quiz.count(),
      prisma.question.count(),
      prisma.quizAttempt.count(),
      prisma.quizSession.count({ where: { status: 'ACTIVE' } }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true, email: true, role: true } } },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalInstructors,
        totalStudents,
        totalQuizzes,
        totalQuestions,
        totalAttempts,
        activeSessions,
      },
      recentAuditLogs,
    });
  } catch (error: any) {
    console.error('Fetch admin stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
