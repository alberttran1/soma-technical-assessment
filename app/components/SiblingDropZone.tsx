import { useDroppable } from "@dnd-kit/core";
import { Todo } from "@prisma/client";

interface SiblingDropZoneProps {
    afterTodoId: number
    todoMap?: Map<number, Todo & { children: Todo[] }>
}

const SiblingDropZone = ({afterTodoId, todoMap} : SiblingDropZoneProps) => {
    const { isOver, setNodeRef, active } = useDroppable({ id: `after-${afterTodoId}` });

    const activeTodo = todoMap?.get(parseInt(active?.id.toString() || ""));
    const afterTodo = todoMap?.get(afterTodoId);

    const activeTodoIsAfter = activeTodo &&
      ((activeTodo.dependedById == afterTodo?.dependedById) ||
        (!activeTodo.dependedById && !afterTodo?.dependedById))
      && activeTodo.order === (afterTodo?.order ?? 0) + 1;

    const activeTodoIsBeforeOrAfter = (active?.id == afterTodoId) || activeTodoIsAfter;

    return (
      <li
        ref={setNodeRef}
        className={`rounded border-2 transition-colors h-0 mt-3 mb-2 ${
          isOver && !activeTodoIsBeforeOrAfter ? "border-green-500 bg-green-200" : "border-transparent"
        }`}
        aria-label={`Drop zone after todo ${afterTodoId}`}
      />
    );
  }

  export default SiblingDropZone;