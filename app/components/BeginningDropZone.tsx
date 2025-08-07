import { useDroppable } from "@dnd-kit/core";
import { Todo } from "@prisma/client";

interface BeginningDropZoneProps {
    parentTodoId: number | null;
    todoMap?: Map<number, Todo & { children: Todo[] }>;
}

const BeginningDropZone = ({ parentTodoId, todoMap } : BeginningDropZoneProps) => {
    const { isOver, setNodeRef, active } = useDroppable({ id: `beginningOf-${parentTodoId}` });

    const activeTodo = todoMap?.get(parseInt(active?.id.toString() || ""));

    const activeTodoIsFirst = activeTodo && activeTodo.dependedById === parentTodoId && activeTodo.order === 0;

    return (
      <li
        ref={setNodeRef}
        className={`rounded border-2 transition-colors h-0 list-none mb-3 mt-2 ${
          isOver && !activeTodoIsFirst ? "border-green-500 bg-green-200" : "border-transparent"
        }`}
        aria-label={`First drop zone in ${parentTodoId}`}
      />
    );
}

export default BeginningDropZone
