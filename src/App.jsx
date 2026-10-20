
import { useState, useEffect } from 'react';

// ========================================
// AIYSHA'S KANBAN — M4 + M5
// ========================================

export const STAGES = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
];

export const TEAM = [
  'Teammate A',
  'Teammate B',
  'Teammate C'
];

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved !== null
        ? JSON.parse(saved)
        : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [key, value]);

  return [value, setValue];
}

// ========================================
// STARTER TASKS
// ========================================

const SEED_TASKS = [
  {
    id: 'TASK-001',
    title: 'Design Kanban Board',
    description: 'Create a responsive project board.',
    type: 'feature',
    status: 'todo',
    assignee: TEAM[0],
    dueDate: null,
    createdDate: '2026-10-20'
  },
  {
    id: 'TASK-002',
    title: 'Build Task Cards',
    description: 'Develop reusable task cards.',
    type: 'feature',
    status: 'in-progress',
    assignee: TEAM[1],
    dueDate: null,
    createdDate: '2026-10-20'
  },
  {
    id: 'TASK-003',
    title: 'Test Board Layout',
    description: 'Check task layout and responsiveness.',
    type: 'bug',
    status: 'review',
    assignee: TEAM[2],
    dueDate: null,
    createdDate: '2026-10-20'
  },
  {
    id: 'TASK-004',
    title: 'Set Up React Project',
    description: 'Configure Vite, React and Tailwind.',
    type: 'feature',
    status: 'done',
    assignee: TEAM[0],
    dueDate: null,
    createdDate: '2026-10-20'
  }
];

// ========================================
// COLUMN STYLES
// ========================================

const STAGE_STYLES = {
  todo: {
    dot: 'bg-slate-400',
    badge: 'bg-slate-200 text-slate-700'
  },
  'in-progress': {
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700'
  },
  review: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700'
  },
  done: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700'
  }
};

// ========================================
// TASK CARD
// ========================================

function TaskCard({ task, onEdit }) {
  const initials = (task.assignee || '')
    .split(' ')
    .filter(Boolean)
    .map((name) => name[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onEdit(task)}
      aria-label={`Edit ${task.title}`}
      className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-medium text-slate-400">
          {task.id}
        </span>

        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600">
          {task.type}
        </span>
      </div>

      <h3 className="break-words text-sm font-semibold leading-6 text-slate-900">
        {task.title}
      </h3>

      <p className="mt-2 break-words text-xs leading-5 text-slate-500">
        {task.description || 'No description provided.'}
      </p>

      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
          {initials || '?'}
        </div>

        <span className="truncate text-xs font-medium text-slate-600">
          {task.assignee}
        </span>
      </div>
    </button>
  );
}

// ========================================
// M5 — ADD / EDIT / DELETE MODAL
// ========================================

function TaskModal({
  task,
  isNew,
  onSave,
  onDelete,
  onClose
}) {
  const [form, setForm] = useState({ ...task });
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, [onClose]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError('Please enter a task title.');
      return;
    }

    onSave({
      ...form,
      title: form.title.trim(),
      description: (form.description || '').trim(),
      dueDate: form.dueDate || null
    });
  }

  const fieldClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  const labelClass =
    'mb-1.5 block text-xs font-semibold text-slate-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2
              id="task-modal-title"
              className="text-xl font-bold text-slate-900"
            >
              {isNew ? 'Create New Task' : 'Edit Task'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isNew
                ? 'Add a task to your project board.'
                : 'Update your task information.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close task form"
            className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="task-title"
              className={labelClass}
            >
              Task Title *
            </label>

            <input
              id="task-title"
              autoFocus
              value={form.title}
              onChange={(event) => {
                update('title', event.target.value);
                setError('');
              }}
              placeholder="e.g. Build login page"
              className={fieldClass}
            />

            {error && (
              <p
                role="alert"
                className="mt-1 text-xs text-rose-600"
              >
                {error}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="task-description"
              className={labelClass}
            >
              Description
            </label>

            <textarea
              id="task-description"
              rows={3}
              value={form.description || ''}
              onChange={(event) =>
                update('description', event.target.value)
              }
              placeholder="Describe what needs to be done..."
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-type"
                className={labelClass}
              >
                Task Type
              </label>

              <select
                id="task-type"
                value={form.type}
                onChange={(event) =>
                  update('type', event.target.value)
                }
                className={fieldClass}
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-status"
                className={labelClass}
              >
                Status
              </label>

              <select
                id="task-status"
                value={form.status}
                onChange={(event) =>
                  update('status', event.target.value)
                }
                className={fieldClass}
              >
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-assignee"
                className={labelClass}
              >
                Assigned To
              </label>

              <select
                id="task-assignee"
                value={form.assignee}
                onChange={(event) =>
                  update('assignee', event.target.value)
                }
                className={fieldClass}
              >
                {TEAM.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-due"
                className={labelClass}
              >
                Due Date
              </label>

              <input
                id="task-due"
                type="date"
                value={form.dueDate || ''}
                onChange={(event) =>
                  update('dueDate', event.target.value)
                }
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div>
              {!isNew && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Delete this task? This cannot be undone.'
                      )
                    ) {
                      onDelete(form.id);
                    }
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Delete Task
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {isNew ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================
// MAIN APPLICATION
// ========================================

export default function App() {
  const [tasks, setTasks] = useLocalStorage(
    'vibetracker.tasks',
    SEED_TASKS
  );

  const [editingTask, setEditingTask] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // ======================================
  // M5 — TASK OPERATIONS
  // ======================================

  function createTask() {
    const newTask = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      type: 'feature',
      status: 'todo',
      assignee: TEAM[0],
      dueDate: null,
      createdDate: new Date().toISOString().slice(0, 10)
    };

    setEditingTask(newTask);
    setIsCreating(true);
  }

  function editTask(task) {
    setEditingTask(task);
    setIsCreating(false);
  }

  function closeModal() {
    setEditingTask(null);
    setIsCreating(false);
  }

  function saveTask(task) {
    if (isCreating) {
      setTasks((current) => [...current, task]);
    } else {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? task : item
        )
      );
    }

    closeModal();
  }

  function deleteTask(id) {
    setTasks((current) =>
      current.filter((task) => task.id !== id)
    );

    closeModal();
  }

  const totalTasks = tasks.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-xl font-bold text-white">
              A
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Aiysha's Kanban
              </h1>

              <p className="text-xs text-slate-500">
                Your personal project workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-xs font-medium text-emerald-700">
              Project Workspace
            </span>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT — NO DASHBOARD */}

      <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8">

        {/* MY TASKS HEADER */}

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              My Tasks
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage your project tasks in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
              {totalTasks} tasks
            </span>

            <button
              type="button"
              onClick={createTask}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              + New Task
            </button>
          </div>
        </section>

        {/* FOUR-COLUMN KANBAN BOARD */}

        <main className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-4">

          {STAGES.map((stage) => {
            const stageTasks = tasks.filter(
              (task) => task.status === stage.id
            );

            const style = STAGE_STYLES[stage.id];

            return (
              <section
                key={stage.id}
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-100/70 p-3"
              >
                <div className="mb-4 flex items-center justify-between px-1 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                    />

                    <h3 className="text-sm font-bold text-slate-800">
                      {stage.label}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${style.badge}`}
                  >
                    {stageTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {stageTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={editTask}
                    />
                  ))}

                  {stageTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-10 text-center">
                      <p className="text-xs text-slate-400">
                        No tasks yet
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </main>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center">
          <p className="text-xs text-slate-400">
            Aiysha's Kanban · UXD Vibecoding Hackathon 2026
          </p>
        </footer>

      </div>

      {/* M5 — CREATE / EDIT MODAL */}

      {editingTask && (
        <TaskModal
          key={editingTask.id}
          task={editingTask}
          isNew={isCreating}
          onSave={saveTask}
          onDelete={deleteTask}
          onClose={closeModal}
        />
      )}

    </div>
  );
}
