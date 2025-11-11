'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { regenerateTaskCodes } from '@/lib/utils/codeGenerator';

export interface TaskItem {
  code: string;
  description: string;
  order: number;
}

interface TaskManagerProps {
  processCode: string;
  tasks: TaskItem[];
  onChange: (tasks: TaskItem[]) => void;
  disabled?: boolean;
}

interface SortableTaskProps {
  task: TaskItem;
  onUpdate: (code: string, description: string) => void;
  onRemove: (code: string) => void;
  disabled?: boolean;
}

const SortableTask: React.FC<SortableTaskProps> = ({
  task,
  onUpdate,
  onRemove,
  disabled,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.code });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
    >
      {/* Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="mt-2 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </button>

      {/* Task Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded">
            {task.code}
          </span>
        </div>
        <textarea
          value={task.description}
          onChange={(e) => onUpdate(task.code, e.target.value)}
          placeholder="Describe this task..."
          disabled={disabled}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(task.code)}
        disabled={disabled}
        className="mt-2 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export const TaskManager: React.FC<TaskManagerProps> = ({
  processCode,
  tasks,
  onChange,
  disabled = false,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((task) => task.code === active.id);
      const newIndex = tasks.findIndex((task) => task.code === over.id);

      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);

      // Regenerate task codes based on new order
      const tasksWithNewCodes = regenerateTaskCodes(processCode, reorderedTasks);
      onChange(tasksWithNewCodes);
    }
  };

  const handleAddTask = () => {
    const newOrder = tasks.length + 1;
    const newTask: TaskItem = {
      code: `${processCode}_T${newOrder}`,
      description: '',
      order: newOrder,
    };
    onChange([...tasks, newTask]);
  };

  const handleUpdateTask = (code: string, description: string) => {
    const updatedTasks = tasks.map((task) =>
      task.code === code ? { ...task, description } : task
    );
    onChange(updatedTasks);
  };

  const handleRemoveTask = (code: string) => {
    if (tasks.length === 1) {
      alert('At least one task is required');
      return;
    }
    const filteredTasks = tasks.filter((task) => task.code !== code);
    // Regenerate codes after removal
    const tasksWithNewCodes = regenerateTaskCodes(processCode, filteredTasks);
    onChange(tasksWithNewCodes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Tasks ({tasks.length})
        </h3>
        <Button
          type="button"
          onClick={handleAddTask}
          disabled={disabled}
          size="sm"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">No tasks yet. Add your first task.</p>
          <Button type="button" onClick={handleAddTask} disabled={disabled}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Task
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tasks.map((t) => t.code)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {tasks.map((task) => (
                <SortableTask
                  key={task.code}
                  task={task}
                  onUpdate={handleUpdateTask}
                  onRemove={handleRemoveTask}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <p className="text-sm text-gray-500 italic">
        Tip: Drag and drop to reorder tasks. Task codes will update automatically.
      </p>
    </div>
  );
};
