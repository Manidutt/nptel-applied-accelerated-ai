import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let whereClause: any = {};
    if (user.role === 'INSTRUCTOR') {
      whereClause.instructorId = user.userId;
    }

    const classes = await prisma.class.findMany({
      where: whereClause,
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            enrollments: true,
            quizzes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ classes });
  } catch (error: any) {
    console.error('Fetch classes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Class name and code are required.' }, { status: 400 });
    }

    const existing = await prisma.class.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existing) {
      return NextResponse.json({ error: `A class with code "${code}" already exists.` }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        instructorId: user.userId,
      },
    });

    return NextResponse.json({ success: true, class: newClass }, { status: 201 });
  } catch (error: any) {
    console.error('Create class error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
