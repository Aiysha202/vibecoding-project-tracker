
import { useState, useEffect } from 'react';

/**
 * Aiysha's Kanban — Vibecoding Project Tracker
 *
 * M4  data-model: Four-column board with example tasks.
 * M5  crud-modal: Add, edit and delete tasks.
 * M6  tag-style: Feature and bug colours.
 * M7  task-owner: Assignee and hand-off.
 * M8  due-tint: Deadline indicators.
 * M9  context: AI prompt context.
 * M10 copy-prompt: Copy formatted context.
 * M11 anchors: Project deliverables.
 * M12 secret-sauce: Unique project feature.
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {'feature'|'bug'} type
 * @property {'todo'|'in-progress'|'review'|'done'} status
 * @property {string} assignee
 * @property {string|null} dueDate
 * @property {string} createdDate
 */

// Original locked stages — unchanged.
export const STAGES = [
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review',      label: 'Review' },
  { id: 'done',        label: 'Done' },
];

// Replace placeholders with actual team members.
export const TEAM = [
  'Teammate A',
  'Teammate B',
  'Teammate C'
];

// Original localStorage hook — unchanged.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode error — silently ignore for hackathon */
    }
  }, [key, value]);

  return [value, setValue];
}

// ========================================
// M4 — EXAMPLE TASKS
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
// BOARD COLOURS
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

function TaskCard({ task }) {
  const initials = task.assignee
    .split(' ')
    .filter(Boolean)
    .map(name => name[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-400">
          {task.id}
        </span>

        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600">
          {task.type}
        </span>
      </div>

      <h3 className="text-sm font-semibold leading-6 text-slate-900">
        {task.title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {task.description}
      </p>

      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
          {initials}
        </div>

        <span className="truncate text-xs font-medium text-slate-600">
          {task.assignee}
        </span>
      </div>

    </article>
  );
}

// ========================================
// MAIN APPLICATION
// ========================================

export default function App() {

  // M4 — Persistent task data.
  const [tasks, setTasks] = useLocalStorage(
    'vibetracker.tasks',
    SEED_TASKS
  );

  // TODO M5 crud-modal:
  // const [editing, setEditing] = useState(null);

  // TODO M11 anchors:
  // const [anchors, setAnchors] =
  //   useLocalStorage('vibetracker.anchors', []);

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    task => task.status === 'done'
  ).length;

  const inProgressTasks = tasks.filter(
    task => task.status === 'in-progress'
  ).length;

  const progress = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ================================== */}
      {/* HEADER — AIYSHA'S KANBAN           */}
      {/* ================================== */}

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

      {/* ================================== */}
      {/* MAIN CONTENT                       */}
      {/* ================================== */}

      <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8">

        <section className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">
            MY WORKSPACE
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Project Board
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Organise your tasks, track your progress and
            keep everything in one place.
          </p>
        </section>

        {/* ================================== */}
        {/* COMPACT PROJECT OVERVIEW           */}
        {/* ================================== */}

        <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Total Tasks
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalTasks}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              In Progress
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-600">
              {inProgressTasks}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Completed
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {completedTasks}
            </p>
          </div>

        </section>

        {/* ================================== */}
        {/* PROJECT PROGRESS                   */}
        {/* ================================== */}

        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Overall Progress
            </h3>

            <span className="text-sm font-bold text-blue-600">
              {progress}%
            </span>
          </div>

          <div
            className="h-2.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Project completion"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

        </section>

        {/* TODO M11 anchors:
            Render the deliverables board here.
        */}

        {/* ================================== */}
        {/* KANBAN BOARD HEADER                */}
        {/* ================================== */}

        <section className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              My Tasks
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Your project workflow at a glance.
            </p>
          </div>

          <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
            {totalTasks} tasks
          </span>
        </section>

        {/* TODO M5 crud-modal:
            Add the new task button and editing modal.
        */}

        {/* ================================== */}
        {/* M4 — FOUR COLUMN BOARD             */}
        {/* NO HORIZONTAL SCROLLING            */}
        {/* ================================== */}

        <main className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-4">

          {STAGES.map(stage => {

            const stageTasks = tasks.filter(
              task => task.status === stage.id
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

                  {stageTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
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

        {/* TODO M6 tag-style:
            Add feature vs bug styling.
        */}

        {/* TODO M7 task-owner:
            Add hand-off dropdown.
        */}

        {/* TODO M8 due-tint:
            Add deadline colour indicators.
        */}

        {/* TODO M9 context:
            Add AI prompt context field.
        */}

        {/* TODO M10 copy-prompt:
            Add copy context button.
        */}

        {/* TODO M12 secret-sauce:
            Add unique project feature.
        */}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-center">
          <p className="text-xs text-slate-400">
            Aiysha's Kanban · UXD Vibecoding Hackathon 2026
          </p>
        </footer>

      </div>
    </div>
  );
}
