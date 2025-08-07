import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

export async function DELETE(request: Request, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Step 0: Get the target todo info
      const target = await tx.todo.findUnique({
        where: { id },
        select: {
          dependedById: true,
          order: true,
        },
      });

      if (!target) throw new Error('Todo not found');
      const parentId = target.dependedById;

      // Step 1: Get children of the todo to be deleted
      const children = await tx.todo.findMany({
        where: { dependedById: id },
      });

      // Step 2: Get all current siblings under the parent
      const siblings = await tx.todo.findMany({
        where: {
          dependedById: parentId,
          NOT: { id },
        },
        orderBy: { order: "asc" },
      });

      // Step 3: Temporarily clear order for all affected todos to avoid duplicates
      const affected = [...children, ...siblings];
      for (const todo of affected) {
        await tx.todo.update({
          where: { id: todo.id },
          data: { order: -1 },
        });
      }

      // Step 4: Delete the target todo
      await tx.todo.delete({ where: { id } });

      // Step 5: New combined list: siblings + children go into parent's list
      // Insert children at the deleted todo's previous position
      const newSiblings: typeof siblings = [...siblings];
      newSiblings.splice(target.order ?? 0, 0, ...children);

      // Step 6: Reassign order 0 → n
      for (let i = 0; i < newSiblings.length; i++) {
        await tx.todo.update({
          where: { id: newSiblings[i].id },
          data: {
            dependedById: parentId,
            order: i,
          },
        });
      }
    });

    return NextResponse.json({ message: 'Todo deleted' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error deleting todo', details: error },
      { status: 500 }
    );
  }
}


export async function PATCH(request: Request, { params }: Params) {
  const id = parseInt(params.id);
  const { dependedById, order } = await request.json();

  if (isNaN(id) || typeof order !== "number") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Temporarily set to invalid order to avoid collision
      await tx.todo.update({
        where: { id },
        data: { dependedById, order: -1 },
      });

      // Fetch all siblings (excluding the updated todo)
      const siblings = await tx.todo.findMany({
        where: {
          dependedById,
          NOT: { id },
        },
        orderBy: { order: "asc" },
      });

      // Insert the updated todo at the correct index
      const updatedTodo = await tx.todo.findUnique({ where: { id } });
      const newOrderList = [...siblings];
      newOrderList.splice(order, 0, updatedTodo!);

      // Reassign order in DESCENDING order to avoid unique constraint violations
      for (let i = newOrderList.length - 1; i >= 0; i--) {
        await tx.todo.update({
          where: { id: newOrderList[i].id },
          data: { order: i },
        });
      }

      return await tx.todo.findUnique({ where: { id } });
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Update failed", details: err },
      { status: 500 }
    );
  }
}
