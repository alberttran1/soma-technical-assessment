import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching todos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate, imgURL, duration } = await request.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Get current number of root-level todos (no dependedById)
    const rootCount = await prisma.todo.count({
      where: { dependedById: null },
    });

    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate,
        imgURL,
        duration,
        order: rootCount, // Set new todo's order to end of root-level list
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating todo' }, { status: 500 });
  }
}