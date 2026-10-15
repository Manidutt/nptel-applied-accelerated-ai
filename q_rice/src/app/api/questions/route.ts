import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const type = searchParams.get('type') || '';
    const bankId = searchParams.get('bankId') || '';

    const whereClause: any = {
      ...(user.role === 'INSTRUCTOR' ? { instructorId: user.userId } : {}),
      ...(type ? { type } : {}),
      ...(bankId ? { bankId } : {}),
    };

    if (search) {
      whereClause.OR = [
        { statement: { contains: search } },
        { tags: { contains: search } },
        { explanation: { contains: search } },
      ];
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        options: { orderBy: { optionKey: 'asc' } },
        bank: { select: { id: true, title: true, subject: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const banks = await prisma.questionBank.findMany({
      where: user.role === 'INSTRUCTOR' ? { instructorId: user.userId } : {},
      orderBy: { title: 'asc' },
    });

    return NextResponse.json({ questions, banks });
  } catch (error: any) {
    console.error('Fetch question bank error:', error);
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
    const { statement, type, marks, negativeMarks, explanation, tags, bankId, options } = body;

    if (!statement || !statement.trim()) {
      return NextResponse.json({ error: 'Question statement is required.' }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'At least two options are required.' }, { status: 400 });
    }

    const newQuestion = await prisma.question.create({
      data: {
        instructorId: user.userId,
        bankId: bankId || null,
        statement: statement.trim(),
        type: type || 'single_choice',
        marks: parseFloat(marks || '1.0'),
        negativeMarks: parseFloat(negativeMarks || '0.0'),
        explanation: explanation?.trim() || null,
        tags: tags?.trim() || null,
        options: {
          create: options.map((opt: any) => ({
            optionKey: opt.optionKey || opt.key,
            text: opt.text.trim(),
            isCorrect: Boolean(opt.isCorrect),
          })),
        },
      },
      include: {
        options: true,
      },
    });

    return NextResponse.json({ success: true, question: newQuestion }, { status: 201 });
  } catch (error: any) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
