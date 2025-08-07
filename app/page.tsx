"use client";
import { Todo } from '@prisma/client';
import { useState, useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';
import {
  DndContext,
  DragEndEvent,
  closestCorners,
} from '@dnd-kit/core';
import DraggableTodoItem from './components/DraggableTodoItem';
import BeginningDropZone from './components/BeginningDropZone';

export default function Home() {
  const [newTodo, setNewTodo] = useState<{ name: string; date?: Date; duration?: number }>({ name: "", date: new Date(), duration: undefined});
  const [todos, setTodos] = useState<(Todo & { children: Todo[] })[]>([]);
  const [todoMap, setTodoMap] = useState<Map<number, Todo & { children: Todo[] }>>();
  const [durationBeforeStartMap, setDurationBeforeStartMap] = useState<Map<number, number>>(new Map());
  const [criticalPathIds, setCriticalPathIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loadingTodos, setLoadingTodos] = useState<boolean>(false);
  const [loadingCreateTodo, setLoadingCreateTodo] = useState<boolean>(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    setLoadingTodos(true);
    try {
      const res = await fetch('/api/todos');
      const data: Todo[] = await res.json();

      const buildNestedTodos = (flatTodos: Todo[]) => {
        const todoMap = new Map<number, Todo & { children: Todo[] }>();
        const roots: (Todo & { children: Todo[] })[] = [];

        flatTodos.forEach(todo => {
          todoMap.set(todo.id, { ...todo, children: [] });
        });

        flatTodos.forEach(todo => {
          const current = todoMap.get(todo.id)!;
          if (todo.dependedById) {
            const parent = todoMap.get(todo.dependedById);
            if (parent) parent.children.push(current);
          } else {
            roots.push(current);
          }
        });

        for (const todo of todoMap.values()) {
          todo.children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
        roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        return { roots, todoMap };
      };

      const { roots, todoMap } = buildNestedTodos(data);

      const { earliestStartMap, criticalPathIds } = computeCriticalPath(roots,todoMap);

      setTodos(roots);
      setTodoMap(todoMap);
      setDurationBeforeStartMap(earliestStartMap);
      setCriticalPathIds(criticalPathIds);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoadingTodos(false);
    }
  };

  function computeCriticalPath(
    todos: (Todo & { children: Todo[] })[],
    todoMap: Map<number, Todo & { children: Todo[] }>
  ) {
    const earliestStartMap = new Map<number, number>();
    const criticalPathIds = new Set<number>();

    function dfs(todo: Todo & { children: Todo[] }): { totalDuration: number; path: number[] } {
      if (todo.children.length === 0) {
        earliestStartMap.set(todo.id, 0);
        return { totalDuration: todo.duration || 0, path: [todo.id] };
      }

      let maxDuration = 0;
      let criticalPath: number[] = [];

      for (const child of todo.children) {
        const resolvedChild = todoMap.get(child.id);
        if (!resolvedChild) continue;

        const { totalDuration, path } = dfs(resolvedChild);
        if (totalDuration > maxDuration) {
          maxDuration = totalDuration;
          criticalPath = path;
        }
      }

      earliestStartMap.set(todo.id, maxDuration);
      return {
        totalDuration: (todo.duration || 0) + maxDuration,
        path: [todo.id, ...criticalPath],
      };
    }

    // Find the root with the maximum totalDuration critical path
    let maxRootDuration = 0;
    let maxRootPath: number[] = [];

    for (const root of todos) {
      const { totalDuration, path } = dfs(root);
      if (totalDuration > maxRootDuration) {
        maxRootDuration = totalDuration;
        maxRootPath = path;
      }
    }

    // Mark only the todos on the longest critical path
    for (const id of maxRootPath) {
      criticalPathIds.add(id);
    }

    return { earliestStartMap, criticalPathIds };
  }


  const handleAddTodo = async () => {
    if (!newTodo?.name.trim() || !newTodo?.duration) return;
    if (newTodo?.date && isNaN(newTodo?.date.getTime())) {
      setError("Invalid date");
      return;
    }
    setLoadingCreateTodo(true);
    try {
      const imgURL = await fetchImage(newTodo.name);
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodo.name,
          dueDate: newTodo.date,
          imgURL: imgURL || "",
          duration: newTodo.duration,
        }),
      });
      setNewTodo({name: "", duration: 1, date: new Date()});
      fetchTodos();
      setError("");
    } catch (error) {
      console.error('Failed to add todo:', error);
    } finally {
      setLoadingCreateTodo(false);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      fetchTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleSetDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // string in YYYY-MM-DD format or empty/invalid while typing
    // setDateInput(value);

    // Validate format using regex
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        setNewTodo(prev => ({...prev,date: parsedDate}));
      } else {
        setNewTodo(prev => ({...prev,date: undefined}));
      }
    } else {
      setNewTodo(prev => ({...prev,date: undefined}));
    }
  };

  const fetchImage = async (title: string) => {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(title)}&per_page=1`,
        {
          headers: {
            Authorization: "Cw8AYOgvw5BaBRrbaDy3MLxzzL0CtTy78jfYobOfCou172zOcG0c9MMS",
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch image");
      const data = await res.json();
      return data.photos?.[0]?.src?.medium || null;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = parseInt(active.id.toString());
    const overIdRaw = over.id.toString();

    const activeTodo = todoMap?.get(activeId);

    // check if creating a dependency loop
    let activeTodoChildren: number[] = [];

    const createChildrenArray = (todo: Todo & { children: Todo[] }) => {
      activeTodoChildren.push(todo.id);
      todo.children.forEach(childTodo => {
        createChildrenArray(todoMap?.get(childTodo.id)!);
      });
    };

    createChildrenArray(todoMap?.get(activeId)!);

    if (/^\d+$/.test(overIdRaw)) {
      const newParentId = parseInt(overIdRaw);

      const firstChild = activeTodo && activeTodo.dependedById == newParentId && activeTodo.order === 0;

      if (firstChild) return;
      if (activeTodoChildren.includes(parseInt(overIdRaw))) return;

      setLoadingId(activeId);

      await fetch(`/api/todos/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependedById: newParentId, order: 0 }),
      });

      fetchTodos();
      setLoadingId(null);
      return;
    }

    const afterMatch = overIdRaw.match(/^after-(\d+)$/);
    if (afterMatch) {
      const afterId = parseInt(afterMatch[1]);
      const newParentId = todoMap?.get(afterId)?.dependedById;
      let overOrder = todoMap?.get(afterId)?.order;

      if (activeTodoChildren.includes(afterId)) return;

      if (newParentId === activeTodo?.dependedById && overOrder! > activeTodo?.order!) overOrder!--;

      setLoadingId(activeId);

      await fetch(`/api/todos/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependedById: newParentId || null, order: overOrder! + 1 }),
      });

      fetchTodos();
      setLoadingId(null);
      return;
    }

    const beginningMatch = overIdRaw.match(/^beginningOf-(\d+|null)$/);
    if (beginningMatch) {
      const beginningId = parseInt(beginningMatch[1]);
      const newParentId = beginningId || null;

      if (activeTodoChildren.includes(beginningId)) return;

      setLoadingId(activeId);

      await fetch(`/api/todos/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependedById: newParentId || null, order: 0 }),
      });

      fetchTodos();
      setLoadingId(null);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <div className="w-full max-w-xl">
        <h1 className="text-4xl font-bold text-center text-white mb-8">Things To Do App</h1>
        <div className="flex mb-6 items-center gap-2">
          <div className="flex min-w-full">
            <input
              type="text"
              className="flex-grow p-3 rounded-l-full focus:outline-none text-gray-700"
              placeholder="Add a new todo"
              value={newTodo.name}
              onChange={(e) => setNewTodo(prev => {return {...prev, name: e.target.value}})}
            />

            <input
              type="number"
              min={1}
              className="w-40 p-3 text-gray-700 border rounded focus:outline-none"
              placeholder="Task Duration"
              value={newTodo?.duration}
              onChange={(e) => setNewTodo(prev => {return {...prev, duration: Number(e.target.value)}})}
            />

            <input
              type="date"
              onChange={handleSetDate}
              min="1900-01-01"
              max="2099-12-31"
              value={newTodo.date ? newTodo.date.toISOString().substring(0, 10) : ""}
              className="p-3 text-gray-700 border rounded focus:outline-none"
            />

            <button
              onClick={handleAddTodo}
              className="bg-white text-indigo-600 p-3 rounded-r-full hover:bg-gray-100 transition duration-300 flex items-center gap-2"
              disabled={loadingCreateTodo}
            >
              Add
            </button>
          </div>
          {loadingCreateTodo && (
            <span className="animate-spin text-white text-[2rem] h-[2rem] w-[2rem]">
              <FaSpinner />
            </span>
          )}
        </div>
        {error && (
          <p className="text-red-600 font-medium mb-4 w-full flex justify-center">
            Error: {error}
          </p>
        )}
        {loadingTodos ? (
          <div className="flex justify-center">
            <div className="animate-spin text-white text-[2rem] h-[2rem] w-[2rem]">
              <FaSpinner />
            </div>
          </div>
        ) : (
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <BeginningDropZone parentTodoId={null} />
            <ul>
              {todos.map((todo) => (
                <DraggableTodoItem
                  key={todo.id}
                  todo={{...todo,durationBeforeStart: durationBeforeStartMap.get(todo.id)}}
                  onDelete={handleDeleteTodo}
                  loadingId={loadingId}
                  isCritical={criticalPathIds.has(todo.id)} // root level doesn't have critical parent
                  criticalPathIds={criticalPathIds}
                />
              ))}
            </ul>
          </DndContext>
        )}
      </div>
    </div>
  );
}
