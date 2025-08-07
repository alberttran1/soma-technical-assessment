import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Todo } from "@prisma/client";
import { FaBars } from "react-icons/fa";
import { FaX } from "react-icons/fa6";
import SiblingDropZone from "./SiblingDropZone";
import BeginningDropZone from "./BeginningDropZone";

interface DraggableTodoItemProps {
  todo: Todo & { children: Todo[], durationBeforeStart?: number };
  onDelete: (id: number) => void;
  loadingId: number | null;
  isCritical?: boolean;
  todoMap?: Map<number, Todo & { children: Todo[] }>;
  criticalPathIds: Set<number>;
}

const DraggableTodoItem = ({ todo, onDelete, loadingId, isCritical, todoMap, criticalPathIds } : DraggableTodoItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({id: todo.id.toString()});
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: todo.id.toString() });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setDropRef} style={style} className="mb-3 rounded-lg">
      <div
        ref={setNodeRef}
        {...attributes}
        className={`bg-white bg-opacity-95 p-5 rounded-lg shadow-md flex flex-col gap-3 border-4 transition-colors duration-200 cursor-grab
          ${isOver && !isDragging ? 'border-green-400' : isCritical ? 'border-red-400' : 'border-transparent'}
        `}
        role="group"
        aria-label={`Todo item: ${todo.title}`}
      >
        <div className="flex justify-between items-center gap-3">
          <div
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-gray-600 select-none"
            title="Drag to reorder"
            aria-label="Drag handle"
          >
            <FaBars size={20} />
          </div>

          <h3 className="flex-grow text-lg font-semibold text-gray-800 truncate">
            {todo.title}
          </h3>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo.id);
            }}
            className="text-red-500 hover:text-red-700 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label={`Delete todo ${todo.title}`}
          >
            <FaX size={18} />
          </button>
        </div>

        {/* Details: Duration, Due Date, Earliest Start */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {todo.duration !== undefined && (
            <span className="bg-gray-100 rounded px-2 py-1 text-gray-700">
              Duration: <strong>{todo.duration} day{todo.duration !== 1 ? 's' : ''}</strong>
            </span>
          )}

          {todo.dueDate && (() => {
            const todayStr = new Date().toISOString().split('T')[0]; // 'yyyy-mm-dd'
            const dueDateStr = new Date(todo.dueDate).toISOString().split('T')[0]
            const isPastDue = dueDateStr < todayStr;

            return (
              <span className={`rounded px-2 py-1 ${isPastDue ? 'bg-red-100 text-red-700 font-semibold' : 'bg-gray-100 text-gray-700'}`}>
                Due: <strong>{dueDateStr}</strong>
              </span>
            );
          })()}

          <span className="bg-blue-100 text-blue-800 rounded px-2 py-1 whitespace-nowrap">
            Earliest Start: <strong>{new Date(Date.now() + (todo.durationBeforeStart ?? 0) * 86400000).toISOString().split('T')[0]}</strong>
          </span>
        </div>

        {/* Image */}
        {todo.imgURL && (
          <img
            src={todo.imgURL}
            alt={`${todo.title} image`}
            className="rounded-md h-32 w-full object-cover mt-2 shadow-sm"
          />
        )}

        {/* Loading Spinner */}
        {loadingId === todo.id && (
          <div className="flex justify-center mt-3">
            <div className="animate-spin h-6 w-6 border-4 border-t-transparent border-gray-500 rounded-full" />
          </div>
        )}

        {/* Children todos */}
        {todo.children.length > 0 && (
          <div className="mt-4 pl-6 border-l-4 border-gray-300">
            <BeginningDropZone parentTodoId={todo.id}  todoMap={todoMap}/>
            <ul className="space-y-2">
              {todo.children.map((child) => (
                <DraggableTodoItem
                  key={child.id}
                  todo={{...child,children: todoMap?.get(child.id)?.children || []}}
                  onDelete={onDelete}
                  loadingId={loadingId}
                  isCritical={criticalPathIds?.has(child.id)}
                  criticalPathIds={criticalPathIds}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
      <SiblingDropZone afterTodoId={todo.id} todoMap={todoMap} />
    </div>
  );
}

export default DraggableTodoItem;