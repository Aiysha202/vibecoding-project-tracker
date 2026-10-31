import { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   PROJECT TRACKER — APP.JSX
   ========================================================= */

const APP_NAME = "Project Tracker";

/* ---------- Stages ---------- */

const STAGES = [
  { id: "todo", label: "To Do", icon: "○" },
  { id: "in-progress", label: "In Progress", icon: "◐" },
  { id: "review", label: "Review", icon: "◇" },
  { id: "done", label: "Done", icon: "✓" },
];

/* ---------- Website development project team ----------
   Aiysha and Amirah were supplied by the project owner.
   The other five names are fictional examples: edit them on the Team page
   before using the tracker to report on real people. */

const STARTER_TEAM = [
  { id: "member-aiysha", name: "Aiysha", email: "", gitlab: "", role: "Senior Developer" },
  { id: "member-amirah", name: "Amirah", email: "", gitlab: "", role: "UX Designer" },
  { id: "member-zara-khan", name: "Zara Khan", email: "", gitlab: "", role: "Front-end Developer" },
  { id: "member-daniel-reed", name: "Daniel Reed", email: "", gitlab: "", role: "Software Architect" },
  { id: "member-sofia-patel", name: "Sofia Patel", email: "", gitlab: "", role: "Senior Developer" },
  { id: "member-noah-carter", name: "Noah Carter", email: "", gitlab: "", role: "Junior Developer" },
  { id: "member-leila-ahmed", name: "Leila Ahmed", email: "", gitlab: "", role: "QA Tester" },
];

const TEAM = STARTER_TEAM.map((member) => member.name);

// Used only when upgrading existing browser data from Claude's demo version.
const DEMO_MEMBERS = new Set([
  "member-1|Amelia Clarke",
  "member-2|Daniel Okafor",
  "member-3|Priya Sharma",
  "member-4|Tom Hughes",
]);

/* ---------- Task types ---------- */

const TYPES = {
  feature: { label: "Feature", glyph: "✦" },
  bug: { label: "Bug", glyph: "◆" },
};

/* ---------- Priorities ---------- */

const PRIORITIES = {
  high: { label: "High", icon: "↑" },
  medium: { label: "Medium", icon: "→" },
  low: { label: "Low", icon: "↓" },
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function taskPriority(task) {
  if (task && PRIORITIES[task.priority]) {
    return task.priority;
  }

  // Older saved tasks without a priority are treated as Medium.
  return "medium";
}

function priorityLabel(task) {
  return PRIORITIES[taskPriority(task)].label;
}

function compareTaskPriority(a, b) {
  return PRIORITY_ORDER[taskPriority(a)] - PRIORITY_ORDER[taskPriority(b)];
}

/* ---------- Text size limits ---------- */

const TEXT_SIZE_MIN = 80;
const TEXT_SIZE_MAX = 150;
const TEXT_SIZE_STEP = 10;
const TEXT_SIZE_DEFAULT = 100;

function clampSize(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return TEXT_SIZE_DEFAULT;
  }

  return Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, Math.round(number)));
}

/* ---------- AI tools and context template ---------- */

const AI_TOOLS = ["Claude", "ChatGPT", "Cursor", "Lovable", "Replit", "Other"];

const TEMPLATE =
  "## Background\n\n" +
  "## Constraints\n\n" +
  "## Tried so far\n\n" +
  "## Pick up\n";

/* ---------- Sidebar navigation ---------- */

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "board", label: "Board", icon: "board" },
  { id: "tasks", label: "All Tasks", icon: "list" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "team", label: "Team", icon: "users" },
  { id: "deliverables", label: "Deliverables", icon: "folder" },
];

/* =========================================================
   LOCAL STORAGE
   Object values are merged with their defaults so newly added
   settings never come back as undefined. Every value can pass
   through a "sanitize" function, so old or damaged saved data
   is repaired instead of crashing. If saving fails (for example
   storage is full) the app is told through a "pt-storage" event.
   ========================================================= */

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

let storageFailing = false;

function reportStorage(ok) {
  // Only announce when the state changes (working <-> failing).
  if (storageFailing === !ok) {
    return;
  }

  storageFailing = !ok;

  try {
    window.dispatchEvent(new CustomEvent("pt-storage", { detail: { ok } }));
  } catch {
    // Ignore event errors.
  }
}

function useLocalStorage(key, initialValue, sanitize = (value) => value) {
  const [value, setValue] = useState(() => {
    const fallback =
      typeof initialValue === "function" ? initialValue() : initialValue;

    try {
      const stored = localStorage.getItem(key);

      if (stored === null) {
        return fallback;
      }

      const parsed = JSON.parse(stored);

      const merged =
        isPlainObject(fallback) && isPlainObject(parsed)
          ? { ...fallback, ...parsed }
          : parsed;

      return sanitize(merged, fallback);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      reportStorage(true);
    } catch {
      reportStorage(false);
    }
  }, [key, value]);

  return [value, setValue];
}

/* =========================================================
   DATE HELPERS
   ========================================================= */

function dateISO(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function today() {
  return dateISO(new Date());
}

function addDays(number) {
  const date = new Date();
  date.setDate(date.getDate() + number);
  return dateISO(date);
}

function daysUntil(dateString) {
  if (!dateString) {
    return null;
  }

  const current = new Date();
  current.setHours(0, 0, 0, 0);

  const target = new Date(`${dateString}T00:00:00`);

  return Math.round((target - current) / 86400000);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function stageLabel(id) {
  return STAGES.find((stage) => stage.id === id)?.label || id;
}

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function initialsOf(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function idNumber(task) {
  return parseInt(String(task.id).replace(/\D/g, ""), 10) || 0;
}

function hasContext(task) {
  return Boolean(
    task.context?.trim() && task.context.trim() !== TEMPLATE.trim()
  );
}

function validUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/* =========================================================
   DUE DATE STATUS
   ========================================================= */

// A consistent three-day warning period keeps deadline behaviour predictable.
const DUE_SOON_DAYS = 3;

function dueInfo(task, soonDays = DUE_SOON_DAYS) {
  if (task.status === "done") {
    return { state: "complete", label: "Completed", short: "Done" };
  }
  if (!task.dueDate) {
    return { state: "none", label: "No due date", short: "No date" };
  }
  const days = daysUntil(task.dueDate);
  if (days === null || Number.isNaN(days)) {
    return { state: "none", label: "No due date", short: "No date" };
  }
  if (days < 0) {
    return { state: "overdue", label: `Overdue by ${-days} ${-days === 1 ? "day" : "days"}`, short: "Overdue" };
  }
  if (days <= 1) {
    return { state: "urgent", label: days === 0 ? "Due today" : "Due tomorrow", short: days === 0 ? "Today" : "Tomorrow" };
  }
  if (days <= soonDays) {
    return { state: "soon", label: `Due in ${days} days`, short: `${days} days` };
  }
  return { state: "normal", label: `Due in ${days} days`, short: formatDate(task.dueDate) };
}

/* =========================================================
   TIME AGO
   ========================================================= */

function timeAgo(value) {
  if (!value) {
    return "";
  }

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return "";
  }

  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

/* =========================================================
   WEBSITE DEVELOPMENT PROJECT — realistic demonstration workload
   21 sample tasks: three relevant tasks for each of seven team members.
   Sample statuses and relative due dates demonstrate the interface; they
   DO NOT claim that real people completed or performed this work.
   Example tasks populate the initial tracker for demonstration.
   ========================================================= */

function makeWebsiteTask(number, title, description, assignee, priority, type, context = "") {
  return {
    id: `TASK-${String(number).padStart(3, "0")}`,
    title,
    description,
    type,
    status: "todo",
    assignee,
    dueDate: null,
    priority,
    createdDate: today(),
    createdAt: new Date().toISOString(),
    context: context || TEMPLATE,
    contextTool: "",
    contextUpdatedAt: null,
  };
}

function websitePrompt(background, constraints, nextStep) {
  return `## Background\n${background}\n\n## Constraints\n${constraints}\n\n## Tried so far\nNot recorded yet; update this after the team begins the task.\n\n## Pick up\n${nextStep}`;
}

const SEED_TASKS_BASE = [
  // Senior Developer: Aiysha — planning, team coordination, handover.
  makeWebsiteTask(201, "Agree website goals and target audience", "Confirm the website's purpose, target visitors, essential pages and acceptance criteria with the client.", "Aiysha", "high", "feature", websitePrompt("The team needs an agreed website scope before development.", "Do not invent client decisions. List assumptions separately from confirmed requirements.", "Prepare a concise requirements checklist and questions for the client.")),
  makeWebsiteTask(214, "Prepare release checklist and handover", "Review deployment readiness, open defects, content approval and documentation needed for handover.", "Aiysha", "medium", "feature", websitePrompt("The team is preparing for a website release.", "Do not claim deployment has happened until the site is live and verified.", "Prepare a release checklist with ownership and verification steps.")),
  makeWebsiteTask(215, "Coordinate sprint tasks and responsibilities", "Review task priorities, confirm ownership and identify blockers across the development team.", "Aiysha", "high", "feature"),

  // UX Designer: Amirah — navigation, wireframes, visual consistency.
  makeWebsiteTask(202, "Create sitemap and navigation plan", "Define page hierarchy and the main visitor journeys, then check that navigation labels are understandable.", "Amirah", "high", "feature", websitePrompt("The website needs clear information architecture.", "Keep the navigation concise and use plain-language labels.", "Propose a sitemap and two important user journeys.")),
  makeWebsiteTask(203, "Design homepage and mobile wireframes", "Prepare desktop and mobile wireframes showing content hierarchy, navigation and key actions.", "Amirah", "high", "feature", websitePrompt("A responsive website needs consistent layouts on desktop and mobile.", "Prioritise readable text, clear hierarchy and keyboard-accessible controls.", "Describe the proposed wireframes and identify decisions needing approval.")),
  makeWebsiteTask(204, "Define accessible visual styles", "Document typography, spacing, contrast-aware colours and reusable button and card styles.", "Amirah", "medium", "feature"),

  // Front-end Developer: Zara Khan — implementation of interface components.
  makeWebsiteTask(205, "Build reusable buttons and content cards", "Implement consistent responsive buttons and cards based on the approved design.", "Zara Khan", "medium", "feature"),
  makeWebsiteTask(206, "Build responsive header and navigation", "Implement a mobile-friendly header with working navigation, visible focus and an accessible menu.", "Zara Khan", "high", "feature", websitePrompt("A React website needs a responsive navigation component.", "Use semantic HTML, visible focus and a correct aria-expanded state.", "Prepare an implementation checklist and keyboard tests.")),
  makeWebsiteTask(207, "Develop homepage layout and sections", "Build the homepage hero, main content sections and footer from the approved wireframes.", "Zara Khan", "high", "feature"),

  // Software Architect: Daniel Reed — technical structure and standards.
  makeWebsiteTask(212, "Review performance and asset strategy", "Check image sizing, component loading and likely performance bottlenecks before release.", "Daniel Reed", "medium", "feature"),
  makeWebsiteTask(217, "Define React component architecture", "Document reusable components, page structure and conventions so developers can work consistently.", "Daniel Reed", "high", "feature", websitePrompt("A small React team needs a maintainable component structure.", "Avoid unnecessary dependencies and keep responsibilities clear.", "Propose a component tree and conventions for shared components.")),
  makeWebsiteTask(218, "Review data handling and technical constraints", "Check the planned contact form, browser-side validation and any data-handling limitations.", "Daniel Reed", "high", "feature"),

  // Senior Developer persona: Sofia Patel — implementation, review and bug fixing.
  makeWebsiteTask(209, "Implement contact form validation", "Add accessible field labels, required-field checks and clear error messages for the contact form.", "Sofia Patel", "high", "feature", websitePrompt("The website needs a contact form with client-side validation.", "Do not claim messages are delivered without a working backend or form service.", "Define validation rules, error states and tests for valid and invalid input.")),
  makeWebsiteTask(219, "Review shared component structure", "Review reusable React components and record improvements needed before integration.", "Sofia Patel", "medium", "feature", websitePrompt("Shared components are ready for senior developer review.", "Preserve agreed functionality and note any breaking changes.", "Create a short review checklist for consistency, accessibility and maintainability.")),
  makeWebsiteTask(220, "Fix mobile navigation keyboard focus", "Investigate the demonstration bug where keyboard focus may not return to the menu button after closing mobile navigation.", "Sofia Patel", "high", "bug", websitePrompt("A mobile navigation focus issue has been added as a sample bug for the prototype.", "Verify and reproduce the issue before claiming it exists in a real website. Keep the menu keyboard-accessible.", "Outline reproduction steps, a potential fix and a regression test.")),

  // Junior Developer: Noah Carter — scoped implementation and responsive checks.
  makeWebsiteTask(208, "Build About and Contact page layouts", "Implement supporting page layouts with consistent headings, navigation and responsive spacing.", "Noah Carter", "medium", "feature"),
  makeWebsiteTask(210, "Check responsive layouts on common screens", "Test phone, tablet and desktop widths; document any overflow or navigation problems found.", "Noah Carter", "high", "feature", websitePrompt("The team needs responsive checks across different screen sizes.", "Do not claim defects without reproducing them. Record viewport and steps for each issue.", "Create a simple responsive test matrix.")),
  makeWebsiteTask(221, "Implement reusable footer and contact links", "Add a responsive footer with working internal links and clear contact information placeholders.", "Noah Carter", "low", "feature"),

  // QA Tester: Leila Ahmed — accessibility and acceptance testing.
  makeWebsiteTask(211, "Audit accessibility and keyboard navigation", "Check heading order, alt text, form labels, focus visibility and colour contrast; record issues found.", "Leila Ahmed", "high", "feature", websitePrompt("The website needs an accessibility review.", "Use WCAG 2.2 AA as a target, not a claim of compliance without testing.", "Create a manual accessibility checklist and record actual findings.")),
  makeWebsiteTask(213, "Run end-to-end website acceptance tests", "Test navigation, links, forms and key visitor journeys, recording pass/fail results.", "Leila Ahmed", "high", "feature", websitePrompt("The website is approaching acceptance testing.", "Do not mark any test as passed without running it.", "Prepare a test matrix for the main user journeys.")),
  makeWebsiteTask(222, "Retest mobile navigation focus bug", "After the fix is ready, repeat keyboard steps and record whether the issue is resolved.", "Leila Ahmed", "high", "bug", websitePrompt("A sample mobile navigation issue has been submitted for QA retesting.", "Do not mark the bug resolved without verifying the actual fix.", "Write a short regression test for opening and closing the mobile menu with a keyboard.")),
];

// Demo workflow distribution, chosen to show every stage and meaningful
// member completion statistics. These are illustrative, not real results.
const SEED_TASK_META = {
  201: ["done", -8],       214: ["todo", 14],          215: ["in-progress", 2],
  202: ["done", -6],       203: ["review", 1],        204: ["in-progress", 6],
  205: ["done", -4],       206: ["in-progress", 0],   207: ["review", 4],
  212: ["todo", 10],       217: ["done", -7],         218: ["in-progress", 3],
  209: ["in-progress", 1], 219: ["done", -2],         220: ["review", -1],
  208: ["in-progress", 7], 210: ["todo", 3],          221: ["review", 9],
  211: ["review", 0],      213: ["todo", 12],         222: ["todo", 5],
};

const SEED_TASKS = SEED_TASKS_BASE.map((task) => {
  const number = Number(task.id.replace("TASK-", ""));
  const [status, dueOffset] = SEED_TASK_META[number] || ["todo", 7];
  return { ...task, status, dueDate: addDays(dueOffset) };
});

// Only these unchanged demo records are replaced during a one-time upgrade.
const DEMO_TASKS = new Set([
  "TASK-001|Define project scope and requirements",
  "TASK-002|Design wireframes and colour palette",
  "TASK-003|Build Kanban board and task cards",
  "TASK-004|Add task editor with AI context",
  "TASK-005|Fix card text overflow on small screens",
  "TASK-006|Test with keyboard and screen reader",
  "TASK-007|Write the project report",
  "TASK-008|Record demo video and prepare presentation",
  "TASK-001|Design Kanban Board",
  "TASK-002|Build Task Cards",
  "TASK-003|Cards overflow on mobile",
  "TASK-004|Set Up React Project",
  "TASK-101|Review project requirements",
  "TASK-102|Plan the interface and design",
  "TASK-103|Set up the four-stage Kanban board",
  "TASK-104|Check task creation and editing",
  "TASK-105|Set up team assignments",
  "TASK-106|Review due dates and calendar",
  "TASK-107|Test accessibility and mobile layout",
  "TASK-108|Prepare presentation and project report",
]);

function previousSavedList(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(saved) ? saved : null;
  } catch {
    return null;
  }
}

function latestSavedList(keys) {
  // Prefer the most recent format, while still supporting older versions.
  for (const key of keys) {
    const saved = previousSavedList(key);
    if (saved) return saved;
  }
  return null;
}

function isDemoMember(member) {
  if (!isPlainObject(member)) return false;
  const name = String(member.name || "").trim();
  return DEMO_MEMBERS.has(`${member.id}|${name}`) ||
    /^Teammate [A-Z]$/i.test(name) ||
    (/^member-placeholder-\d+$/.test(String(member.id || "")) &&
      /^Team Member \d+$/i.test(name));
}

function buildWebsiteTeam(existing) {
  // Keep genuine members and their saved details; remove unchanged sample profiles.
  const members = (Array.isArray(existing) ? existing : [])
    .filter((member) =>
      isPlainObject(member) &&
      typeof member.name === "string" &&
      member.name.trim() &&
      !isDemoMember(member)
    )
    .map((member) => {
      const matchingSeed = STARTER_TEAM.find((seed) =>
        seed.name.toLowerCase() === member.name.trim().toLowerCase()
      );
      const demoContacts = {
        "member-aiysha": ["aiysha@example.com", "aiysha-dev"],
        "member-amirah": ["amirah@example.com", "amirah-ux"],
        "member-zara-khan": ["zara.khan@example.com", "zara-khan"],
        "member-daniel-reed": ["daniel.reed@example.com", "dreed-arch"],
        "member-sofia-patel": ["sofia.patel@example.com", "sofia-patel"],
        "member-noah-carter": ["noah.carter@example.com", "noah-carter"],
        "member-leila-ahmed": ["leila.ahmed@example.com", "leila-ahmed"],
      };
      const sample = demoContacts[member.id];
      return {
        ...member,
        email: sample && member.email === sample[0] ? "" : String(member.email || ""),
        gitlab: sample && member.gitlab === sample[1] ? "" : String(member.gitlab || ""),
        role: String(member.role || matchingSeed?.role || "Team member"),
        name: /^aiysha$/i.test(member.name.trim()) ? "Aiysha" :
          /^amirah$/i.test(member.name.trim()) ? "Amirah" : member.name.trim(),
      };
    });

  for (const person of STARTER_TEAM) {
    if (!members.some((member) =>
      member.name.toLowerCase() === person.name.toLowerCase()
    )) {
      members.push(person);
    }
  }

  return members.filter((member, index, all) =>
    all.findIndex((other) =>
      other.name.toLowerCase() === member.name.toLowerCase()
    ) === index
  );
}

function buildWebsiteTasks(existing) {
  // Remove only unchanged sample tasks; do not discard real tasks or edits.
  const realTasks = (Array.isArray(existing) ? existing : [])
    .filter((task) =>
      isPlainObject(task) && !DEMO_TASKS.has(`${task.id}|${task.title}`)
    )
    .map((task) => {
      const owner = String(task.assignee || "Unassigned").trim();
      return {
        ...task,
        assignee: /^aiysha$/i.test(owner) ? "Aiysha" :
          /^amirah$/i.test(owner) ? "Amirah" :
          /^Teammate [A-Z]$/i.test(owner) ||
          /^Team Member [3-8]$/i.test(owner) ? "Unassigned" : owner,
      };
    });

  const takenIds = new Set(realTasks.map((task) => String(task.id)));
  const takenTitles = new Set(
    realTasks.map((task) => String(task.title || "").trim().toLowerCase())
  );
  let nextId = Math.max(200, ...realTasks.map(idNumber)) + 1;

  for (const suggested of SEED_TASKS) {
    if (takenTitles.has(suggested.title.toLowerCase())) continue;
    let task = suggested;
    if (takenIds.has(task.id)) {
      while (takenIds.has(`TASK-${String(nextId).padStart(3, "0")}`)) nextId++;
      task = { ...suggested, id: `TASK-${String(nextId++).padStart(3, "0")}` };
    }
    realTasks.push(task);
    takenIds.add(task.id);
    takenTitles.add(task.title.toLowerCase());
  }

  return realTasks;
}

function initialTeamWithMigration() {
  return buildWebsiteTeam(latestSavedList([
    "pt.team.v12", "pt.team.v11", "pt.team.v10", "pt.team.v9", "pt.team.v8", "pt.team.v7",
    "pt.team.v6", "pt.team.v5", "pt.team.v4", "pt.team.v3",
    "pt.team.v2", "pt.team.v1",
  ]));
}

function initialTasksWithMigration() {
  return buildWebsiteTasks(latestSavedList([
    "pt.tasks.v15", "pt.tasks.v14", "pt.tasks.v13", "pt.tasks.v12", "pt.tasks.v11", "pt.tasks.v10",
    "pt.tasks.v9", "pt.tasks.v8", "pt.tasks.v7", "pt.tasks.v6",
    "pt.tasks.v5", "pt.tasks.v4",
  ]));
}

/* =========================================================
   DELIVERABLES — EXACTLY FOUR, ALWAYS
   Saved data is run through normalizeAnchors() when it is
   loaded AND every time it changes, so an old saved extra
   item can never come back. Valid saved links are preserved.
   ========================================================= */

const SEED_ANCHORS = [
  "Presentation",
  "Demo",
  "Report",
  "Documentation",
].map((label) => ({ id: label.toLowerCase(), label, url: "" }));

function normalizeAnchors(value) {
  const list = Array.isArray(value) ? value : [];

  return SEED_ANCHORS.map((seed) => {
    const saved = list.find(
      (item) =>
        isPlainObject(item) &&
        (item.id === seed.id ||
          String(item.label || "")
            .trim()
            .toLowerCase() === seed.label.toLowerCase())
    );

    const url = typeof saved?.url === "string" ? saved.url.trim() : "";

    return { ...seed, url: url && validUrl(url) ? url : "" };
  });
}

/* =========================================================
   DISPLAY PREFERENCES
   ========================================================= */

const THEMES = ["light", "dark", "contrast"];

function defaultPrefs() {
  let theme = "light";

  try {
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch {
    // Keep the light theme.
  }

  return { theme, size: TEXT_SIZE_DEFAULT, easy: false, calm: false, palette: "standard" };
}

function sanitizePrefs(value, fallback) {
  const base = isPlainObject(fallback) ? fallback : defaultPrefs();

  if (!isPlainObject(value)) {
    return base;
  }

  // Ignore the removed deadline-warning preference from older saved data.
  const savedAppearance = { ...value };
  delete savedAppearance.soonDays;

  return {
    ...savedAppearance,
    theme: THEMES.includes(value.theme) ? value.theme : base.theme,
    size: clampSize(value.size),
    easy: Boolean(value.easy),
    calm: Boolean(value.calm),
    palette: value.palette === "cb" ? "cb" : "standard",
  };
}

/* =========================================================
   SAVED TASK REPAIR
   Old or damaged saved tasks are repaired, never dropped.
   Existing IDs and AI context are kept exactly as they are.
   ========================================================= */

function sanitizeTasks(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value.filter(
    (task) =>
      isPlainObject(task) &&
      task.id !== undefined &&
      task.id !== null &&
      String(task.id).trim() !== ""
  );

  const seen = new Set();
  let largest = Math.max(0, ...cleaned.map(idNumber));

  return cleaned.map((task) => {
    let id = String(task.id);

    // A duplicate ID would break list keys and saving, so give it a new one.
    if (seen.has(id)) {
      largest += 1;
      id = `TASK-${String(largest).padStart(3, "0")}`;
    }

    seen.add(id);

    return {
      ...task,
      id,
      title: String(task.title ?? ""),
      type: TYPES[task.type] ? task.type : "feature",
      status: STAGES.some((stage) => stage.id === task.status)
        ? task.status
        : "todo",
      assignee:
        typeof task.assignee === "string" && task.assignee.trim()
          ? task.assignee
          : "Unassigned",
      priority: taskPriority(task),
    };
  });
}

/* =========================================================
   ICONS
   ========================================================= */

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,

    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="2" />
        <circle cx="15" cy="17" r="2" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),

    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),

    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),

    note: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),

    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,

    edit: <path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15z" />,

    trash: (
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    ),

    close: <path d="M5 5l14 14M19 5 5 19" />,

    check: <path d="m5 12 4 4L19 6" />,

    external: <path d="M13 5h6v6M19 5l-9 9M19 13v6H5V5h6" />,

    alert: (
      <>
        <path d="m12 3 10 18H2z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),

    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    chevron: <path d="m6 9 6 6 6-6" />,

    board: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 3v18M15 3v12" />
      </>
    ),

    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),

    list: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),

    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
        <path d="M16 5a3 3 0 0 1 0 6" />
        <path d="M18 14a5 5 0 0 1 3 5v1" />
      </>
    ),

    folder: (
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    ),

    menu: <path d="M4 6h16M4 12h16M4 18h16" />,

    chevronLeft: <path d="m15 18-6-6 6-6" />,

    chevronRight: <path d="m9 18 6-6-6-6" />,

    filter: <path d="M4 7h16M7 12h10M10 17h4" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name] || paths.more}
    </svg>
  );
}

/* =========================================================
   COPY AI CONTEXT
   ========================================================= */

function taskToBrief(task) {
  return [
    `# ${task.title}`,
    `Task ID: ${task.id}`,
    `Type: ${TYPES[task.type]?.label || task.type}`,
    `Status: ${stageLabel(task.status)}`,
    `Priority: ${priorityLabel(task)}`,
    `Owner: ${task.assignee}`,
    `Due: ${task.dueDate || "none"}`,
    task.contextTool ? `AI tool: ${task.contextTool}` : "",
    "",
    "## Description",
    task.description || "(none)",
    "",
    "## Context",
    hasContext(task) ? task.context.trim() : "(none provided)",
    "",
    "## Request",
    "Using the context above, help me continue this task. State your assumptions and ask if anything is unclear before writing code.",
  ].join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");

      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.select();

      const success = document.execCommand("copy");

      textarea.remove();

      return success;
    } catch {
      return false;
    }
  }
}

/* =========================================================
   TASK CARD
   Every card uses the same layout so the board stays tidy:
   ID + menu, title, description, badges, then a footer with
   the owner and two icon buttons. The actions menu is
   position: fixed so the board's scroll container never clips
   it, and it flips upward near the bottom of the screen.
   ========================================================= */

const MENU_WIDTH = 210;
const MENU_HEIGHT = 310;

function TaskCard({ task, members, onEdit, onMove, onHandOff, onDelete, notify }) {
  const [showContext, setShowContext] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const type = TYPES[task.type] || TYPES.feature;
  const due = dueInfo(task);
  const priority = taskPriority(task);
  const priorityInfo = PRIORITIES[priority];
  const withContext = hasContext(task);

  function toggleMenu() {
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      const openUp =
        rect.bottom + MENU_HEIGHT + 8 > window.innerHeight &&
        rect.top > MENU_HEIGHT;

      setMenuPos({
        top: openUp ? rect.top - MENU_HEIGHT - 5 : rect.bottom + 5,
        left: Math.max(8, rect.right - MENU_WIDTH),
      });
    }

    setMenuOpen((value) => !value);
  }

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    // Move keyboard focus into the menu when it opens.
    menuRef.current?.querySelector(".task-menu button")?.focus();

    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const closeEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    const closeOnMove = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    window.addEventListener("scroll", closeOnMove, true);
    window.addEventListener("resize", closeOnMove);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
      window.removeEventListener("scroll", closeOnMove, true);
      window.removeEventListener("resize", closeOnMove);
    };
  }, [menuOpen]);

  const copy = async () => {
    const success = await copyText(taskToBrief(task));

    notify(
      success ? `Copied context for ${task.title}` : "Unable to copy context"
    );

    setMenuOpen(false);
  };

  return (
    <li
      className={`task-card due-${due.state}`}
      // Not draggable while the menu is open, so its selects work in Firefox.
      draggable={!menuOpen}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="task-top">
        <span className="task-id">{task.id}</span>

        <div className="task-top-actions">
          <span className={`task-type type-${task.type}`}>
            <span aria-hidden="true">{type.glyph}</span>
            {type.label}
          </span>

          <div className="task-menu-wrap" ref={menuRef}>
            <button
              ref={buttonRef}
              type="button"
              className="icon-button task-more"
              aria-label={`Actions for ${task.title}`}
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              <Icon name="more" size={19} />
            </button>

            {menuOpen && (
              <div
                className="task-menu"
                role="group"
                aria-label={`Actions for ${task.title}`}
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onEdit(task);
                    setMenuOpen(false);
                  }}
                >
                  <Icon name="edit" size={16} />
                  Edit task
                </button>

                <button type="button" onClick={copy}>
                  <Icon name="copy" size={16} />
                  Copy AI context
                </button>

                <div className="menu-divider" />

                <label className="menu-label" htmlFor={`move-${task.id}`}>
                  Move to
                </label>

                <select
                  id={`move-${task.id}`}
                  value={task.status}
                  onChange={(event) => {
                    onMove(task, event.target.value);
                    setMenuOpen(false);
                  }}
                >
                  {STAGES.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>

                <label className="menu-label" htmlFor={`assign-${task.id}`}>
                  Assign to
                </label>

                <select
                  id={`assign-${task.id}`}
                  value={task.assignee}
                  onChange={(event) => {
                    onHandOff(task, event.target.value);
                    setMenuOpen(false);
                  }}
                >
                  {[...new Set([task.assignee, ...members])].map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>

                <div className="menu-divider" />

                <button
                  type="button"
                  className="menu-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(task);
                  }}
                >
                  <Icon name="trash" size={16} />
                  Delete task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The button's accessible name comes from the title and description. */}
      <button type="button" className="task-main" onClick={() => onEdit(task)}>
        <span className="task-title">{task.title}</span>

        {task.description && (
          <span className="task-description">{task.description}</span>
        )}
      </button>

      <div className="task-details">
        <span className={`priority-chip priority-${priority}`}>
          <span className="priority-chip-icon" aria-hidden="true">
            {priorityInfo.icon}
          </span>
          {priorityInfo.label}
          <span className="sr-only"> priority</span>
        </span>

        {task.status === "done" ? (
          <span className="date-chip date-complete">
            <Icon name="check" size={14} />
            Completed
          </span>
        ) : task.dueDate ? (
          <span className={`date-chip date-${due.state}`}>
            <Icon
              name={due.state === "overdue" ? "alert" :
                due.state === "urgent" || due.state === "soon" ? "clock" : "calendar"}
              size={14}
            />
            {due.short}
          </span>
        ) : (
          <span className="date-chip date-none">
            <Icon name="calendar" size={14} />
            No due date
          </span>
        )}
      </div>

      {showContext && withContext && (
        <pre className="card-context">{task.context}</pre>
      )}

      <div className="task-footer">
        <span className="task-assignee">
          <span className="avatar" aria-hidden="true">
            {initialsOf(task.assignee)}
          </span>
          <span className="assignee-name">{task.assignee}</span>
        </span>

        <div className="task-quick-actions">
          {withContext && (
            <button
              type="button"
              className={`icon-button ${showContext ? "is-active" : ""}`}
              title={showContext ? "Hide AI context" : "Show AI context"}
              aria-label={`${showContext ? "Hide" : "Show"} AI context for ${task.title}`}
              aria-expanded={showContext}
              onClick={() => setShowContext((value) => !value)}
            >
              <Icon name="note" size={17} />
            </button>
          )}

          <button
            type="button"
            className="icon-button"
            title="Copy AI context"
            aria-label={`Copy AI context for ${task.title}`}
            onClick={copy}
          >
            <Icon name="copy" size={17} />
          </button>
        </div>
      </div>
    </li>
  );
}

/* =========================================================
   MARKDOWN PREVIEW
   Consecutive bullets become a real <ul>. Fenced code blocks
   (three backticks) and indented lines keep their whitespace
   so pasted logs and stack traces stay readable.
   ========================================================= */

function MarkdownPreview({ text }) {
  const blocks = [];
  let list = null;
  let code = null;

  (text || "").split(/\r?\n/).forEach((line, index) => {
    // Fenced code block: a fence line opens it and the next one closes it.
    if (/^\s*```/.test(line)) {
      if (code) {
        code = null;
      } else {
        list = null;
        code = { type: "code", key: index, lines: [] };
        blocks.push(code);
      }
      return;
    }

    // Inside a code block, keep every line exactly as pasted.
    if (code) {
      code.lines.push(line);
      return;
    }

    if (/^[-*]\s/.test(line)) {
      if (!list) {
        list = { type: "list", key: index, items: [] };
        blocks.push(list);
      }

      list.items.push(line.slice(2));
      return;
    }

    list = null;

    if (!line.trim()) {
      blocks.push({ type: "space", key: index });
    } else if (/^#{1,3}\s/.test(line)) {
      blocks.push({
        type: "heading",
        key: index,
        text: line.replace(/^#+\s/, ""),
      });
    } else {
      blocks.push({ type: "text", key: index, text: line });
    }
  });

  return (
    <div className="markdown-preview">
      {blocks.map((block) => {
        if (block.type === "space") {
          return <div key={block.key} className="markdown-space" />;
        }

        if (block.type === "heading") {
          return (
            <strong key={block.key} className="markdown-heading">
              {block.text}
            </strong>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={block.key}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={block.key}
              className="markdown-code"
              role="group"
              aria-label="Code block"
              tabIndex={0}
            >
              <code>{block.lines.join("\n")}</code>
            </pre>
          );
        }

        return (
          <p
            key={block.key}
            className={/^\s/.test(block.text) ? "markdown-indented" : undefined}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

/* =========================================================
   TASK MODAL
   Warns before discarding unsaved changes.
   ========================================================= */

// Treat an empty date/description/tool the same as a missing one.
function formSnapshot(value) {
  return JSON.stringify({
    ...value,
    dueDate: value.dueDate || null,
    description: value.description || "",
    contextTool: value.contextTool || "",
  });
}

function TaskModal({ task, members, isNew, onSave, onDelete, onClose, notify }) {
  const [initial] = useState(() => ({
    ...task,
    priority: taskPriority(task),
  }));

  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const titleRef = useRef(null);
  const modalRef = useRef(null);
  const closeRef = useRef(onClose);

  const dirty = formSnapshot(form) !== formSnapshot(initial);

  function requestClose() {
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }

    onClose();
  }

  // Keep the keyboard handler pointed at the latest requestClose.
  useEffect(() => {
    closeRef.current = requestClose;
  });

  useEffect(() => {
    const previous = document.activeElement;

    titleRef.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusable = [
          ...modalRef.current.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
          ),
        ].filter((item) => item.getClientRects().length);

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setConfirmDiscard(false);
  };

  const save = (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Please enter a task title.");
      titleRef.current?.focus();
      return;
    }

    const contextChanged =
      form.context !== task.context || form.contextTool !== task.contextTool;

    onSave({
      ...form,
      title: form.title.trim(),
      description: (form.description || "").trim(),
      dueDate: form.dueDate || null,
      priority: taskPriority(form),
      contextUpdatedAt: contextChanged
        ? new Date().toISOString()
        : form.contextUpdatedAt,
    });
  };

  const copy = async () => {
    const success = await copyText(taskToBrief(form));
    notify(success ? "AI context copied" : "Could not copy context");
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-heading"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{isNew ? "NEW TASK" : form.id}</p>
            <h2 id="modal-heading">
              {isNew ? "Create a task" : "Task details"}
            </h2>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="Close task editor"
            onClick={requestClose}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <form onSubmit={save} noValidate>
          <div className="modal-body">
            {/* LEFT COLUMN */}

            <div className="modal-column">
              <div className="form-field">
                <label htmlFor="task-title">Task title (required)</label>

                <input
                  ref={titleRef}
                  id="task-title"
                  value={form.title}
                  placeholder="What needs to be done?"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "task-title-error" : undefined}
                  onChange={(event) => {
                    set("title", event.target.value);
                    setError("");
                  }}
                />

                {error && (
                  <span id="task-title-error" className="form-error" role="alert">
                    {error}
                  </span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="task-description">Description</label>

                <textarea
                  id="task-description"
                  rows={4}
                  value={form.description || ""}
                  placeholder="Add some details..."
                  onChange={(event) => set("description", event.target.value)}
                />
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="task-type">Type</label>

                  <select
                    id="task-type"
                    value={form.type}
                    onChange={(event) => set("type", event.target.value)}
                  >
                    {Object.entries(TYPES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="task-priority">Priority</label>

                  <select
                    id="task-priority"
                    value={taskPriority(form)}
                    onChange={(event) => set("priority", event.target.value)}
                  >
                    {Object.entries(PRIORITIES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.icon} {value.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="task-status">Status</label>

                  <select
                    id="task-status"
                    value={form.status}
                    onChange={(event) => set("status", event.target.value)}
                  >
                    {STAGES.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="task-owner">Assigned to</label>

                  <select
                    id="task-owner"
                    value={form.assignee}
                    onChange={(event) => set("assignee", event.target.value)}
                  >
                    {[...new Set([form.assignee, ...members])].map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="task-due">Due date</label>

                  <input
                    id="task-due"
                    type="date"
                    value={form.dueDate || ""}
                    onChange={(event) => set("dueDate", event.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — AI CONTEXT */}

            <div className="modal-column">
              <div className="form-field">
                <div className="field-header">
                  <label htmlFor={preview ? undefined : "task-context"}>
                    AI context
                  </label>

                  <div className="segmented-control">
                    <button
                      type="button"
                      className={!preview ? "selected" : ""}
                      aria-pressed={!preview}
                      onClick={() => setPreview(false)}
                    >
                      Write
                    </button>

                    <button
                      type="button"
                      className={preview ? "selected" : ""}
                      aria-pressed={preview}
                      onClick={() => setPreview(true)}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {preview ? (
                  <div className="context-preview">
                    <MarkdownPreview text={form.context || ""} />
                  </div>
                ) : (
                  <textarea
                    id="task-context"
                    className="context-editor"
                    rows={13}
                    value={form.context || ""}
                    onChange={(event) => set("context", event.target.value)}
                  />
                )}

                <span className="field-hint">
                  Keep useful context for teammates and AI tools.
                </span>
              </div>

              <div className="form-field">
                <label htmlFor="task-ai-tool">AI tool</label>

                <select
                  id="task-ai-tool"
                  value={form.contextTool || ""}
                  onChange={(event) => set("contextTool", event.target.value)}
                >
                  <option value="">Not specified</option>

                  {AI_TOOLS.map((tool) => (
                    <option key={tool} value={tool}>
                      {tool}
                    </option>
                  ))}
                </select>
              </div>

              {form.contextUpdatedAt && timeAgo(form.contextUpdatedAt) && (
                <p className="field-hint">
                  Context updated {timeAgo(form.contextUpdatedAt)}
                </p>
              )}
            </div>
          </div>

          {confirmDiscard && (
            <div className="discard-banner" role="alert">
              <span>Discard your unsaved changes?</span>

              <button
                type="button"
                className="button button-danger"
                onClick={onClose}
              >
                Discard
              </button>

              <button
                type="button"
                className="button button-secondary"
                onClick={() => setConfirmDiscard(false)}
              >
                Keep editing
              </button>
            </div>
          )}

          <div className="modal-footer">
            <div className="modal-footer-left">
              <button
                type="button"
                className="button button-secondary"
                onClick={copy}
              >
                <Icon name="copy" size={16} />
                Copy context
              </button>

              {!isNew &&
                (confirmDelete ? (
                  <div className="delete-confirm">
                    <span>Delete this task?</span>

                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => onDelete(form)}
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button button-text-danger"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Icon name="trash" size={16} />
                    Delete
                  </button>
                ))}
            </div>

            <div className="modal-footer-right">
              <button
                type="button"
                className="button button-secondary"
                onClick={requestClose}
              >
                Cancel
              </button>

              <button type="submit" className="button button-primary">
                <Icon name="check" size={16} />
                {isNew ? "Create task" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   DELETE CONFIRMATION (opened from the card menu)
   Traps keyboard focus and closes with Escape.
   ========================================================= */

function DeleteConfirm({ task, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const closeRef = useRef(onCancel);

  useEffect(() => {
    closeRef.current = onCancel;
  });

  useEffect(() => {
    const previous = document.activeElement;

    cancelRef.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [
          ...dialogRef.current.querySelectorAll("button:not([disabled])"),
        ];

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="task-modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-heading"
        aria-describedby="delete-description"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{task.id}</p>
            <h2 id="delete-heading">Delete this task?</h2>
          </div>
        </div>

        <div className="confirm-body">
          <p id="delete-description">
            "{task.title}" will be removed permanently.
          </p>
        </div>

        <div className="modal-footer">
          <span />

          <div className="modal-footer-right">
            <button
              ref={cancelRef}
              type="button"
              className="button button-secondary"
              onClick={onCancel}
            >
              Keep
            </button>

            <button
              type="button"
              className="button button-danger"
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ALL TASKS TABLE
   ========================================================= */

function byDueDate(a, b) {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

const SORTERS = {
  due: byDueDate,
  priority: compareTaskPriority,
  title: (a, b) => a.title.localeCompare(b.title),
  status: (a, b) =>
    STAGES.findIndex((stage) => stage.id === a.status) -
    STAGES.findIndex((stage) => stage.id === b.status),
  assignee: (a, b) => (a.assignee || "").localeCompare(b.assignee || ""),
};

function AllTasksView({ tasks, members, hasFilters, onEdit, onMove, onHandOff, onNew }) {
  const [sortBy, setSortBy] = useState("due");

  const compare = SORTERS[sortBy] || byDueDate;

  const visibleTasks = [...tasks].sort(
    (a, b) => compare(a, b) || idNumber(a) - idNumber(b)
  );

  return (
    <section className="view-panel" aria-labelledby="task-list-heading">
      <div className="view-toolbar">
        <div>
          <h3 id="task-list-heading">Task list</h3>
          <p>{tasks.length} {tasks.length === 1 ? "task" : "tasks"} in your project · View and manage priorities, owners and deadlines.</p>
        </div>

        <div className="view-toolbar-actions">
          <label className="toolbar-field">
            <span>Sort by</span>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="due">Due date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
              <option value="status">Status</option>
              <option value="assignee">Assignee</option>
            </select>
          </label>
        </div>
      </div>

      {visibleTasks.length > 0 && (
        <div
          className="tasks-table-wrap"
          role="region"
          aria-label="Task table"
          tabIndex={0}
        >
          <table className="tasks-table">
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Type</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Assignee</th>
                <th scope="col">Due date</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {visibleTasks.map((task) => {
                const due = dueInfo(task);
                const priority = taskPriority(task);
                const priorityInfo = PRIORITIES[priority];
                const taskType = TYPES[task.type] || TYPES.feature;

                return (
                  <tr key={task.id}>
                    <td>
                      <button
                        type="button"
                        className="table-task-link"
                        onClick={() => onEdit(task)}
                      >
                        <span className="table-task-id">{task.id}</span>
                        <strong>{task.title}</strong>
                      </button>
                    </td>

                    <td>
                      <span className={`task-type type-${task.type}`}>
                        <span aria-hidden="true">{taskType.glyph}</span>
                        {taskType.label}
                      </span>
                    </td>

                    <td>
                      <span className={`priority-chip priority-${priority}`}>
                        <span aria-hidden="true">{priorityInfo.icon}</span>
                        {priorityInfo.label}
                      </span>
                    </td>

                    <td>
                      <select
                        className="table-select"
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        onChange={(event) => onMove(task, event.target.value)}
                      >
                        {STAGES.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        className="table-select"
                        aria-label={`Assignee for ${task.title}`}
                        value={task.assignee}
                        onChange={(event) =>
                          onHandOff(task, event.target.value)
                        }
                      >
                        {[...new Set([task.assignee, ...members])].map(
                          (member) => (
                            <option key={member} value={member}>
                              {member}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td>
                      <span className={`date-chip date-${due.state}`}>
                        {task.status === "done"
                          ? "Completed"
                          : task.dueDate
                          ? due.label
                          : "No due date"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Edit ${task.title}`}
                        title="Edit task"
                        onClick={() => onEdit(task)}
                      >
                        <Icon name="edit" size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {visibleTasks.length === 0 && (
        <div className="view-empty-state">
          <Icon name="list" size={30} />

          <strong>{hasFilters ? "No matching tasks" : "No tasks yet"}</strong>

          <p>
            {hasFilters
              ? "Try another filter or clear the search."
              : "Create your first task to get started."}
          </p>

          <button
            type="button"
            className="button button-primary"
            onClick={onNew}
          >
            <Icon name="plus" size={17} />
            New task
          </button>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   DELIVERABLE LINK EDITOR (shared)
   One hook powers BOTH the bar above the board and the
   Deliverables page, so they always behave the same way.
   ========================================================= */

function useAnchorEditor(setAnchors, notify) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function startEditing(anchor) {
    setEditing(anchor.id);
    setDraft(anchor.url || "");
    setError("");
  }

  function cancel() {
    setEditing(null);
    setDraft("");
    setError("");
  }

  function save(id) {
    const trimmed = draft.trim();

    if (trimmed && !validUrl(trimmed)) {
      setError("Enter a full link starting with http:// or https://");
      return;
    }

    setAnchors((current) =>
      current.map((anchor) =>
        anchor.id === id ? { ...anchor, url: trimmed } : anchor
      )
    );

    setEditing(null);
    setDraft("");
    setError("");

    if (notify) {
      notify(trimmed ? "Link saved" : "Link removed");
    }
  }

  function remove(id) {
    setAnchors((current) =>
      current.map((anchor) =>
        anchor.id === id ? { ...anchor, url: "" } : anchor
      )
    );

    if (editing === id) {
      cancel();
    }

    if (notify) {
      notify("Link removed");
    }
  }

  function onInputKeyDown(event, id) {
    if (event.key === "Enter") {
      event.preventDefault();
      save(id);
    }

    if (event.key === "Escape") {
      cancel();
    }
  }

  function onInputChange(event) {
    setDraft(event.target.value);
    setError("");
  }

  return {
    editing,
    draft,
    error,
    startEditing,
    cancel,
    save,
    remove,
    onInputKeyDown,
    onInputChange,
  };
}

/* =========================================================
   DELIVERABLES PAGE
   ========================================================= */

function Deliverables({ anchors, setAnchors, notify }) {
  const editor = useAnchorEditor(setAnchors, notify);

  return (
    <section className="view-panel" aria-labelledby="deliverables-heading">
      <div className="view-header">
        <p className="eyebrow">PROJECT OUTPUTS</p>
        <h3 id="deliverables-heading">Project links</h3>
        <p>Keep the important project links in one place.</p>
      </div>

      <div className="deliverables-grid">
        {anchors.map((anchor) => {
          const isEditing = editor.editing === anchor.id;

          return (
            <div className="deliverable-card" key={anchor.id}>
              <div className="deliverable-icon">
                <Icon name="folder" size={22} />
              </div>

              <div className="deliverable-content">
                <h4>{anchor.label}</h4>

                {isEditing ? (
                  <div className="deliverable-edit">
                    <input
                      autoFocus
                      type="url"
                      value={editor.draft}
                      placeholder="https://..."
                      aria-label={`Link for ${anchor.label}`}
                      aria-invalid={Boolean(editor.error)}
                      onChange={editor.onInputChange}
                      onKeyDown={(event) =>
                        editor.onInputKeyDown(event, anchor.id)
                      }
                    />

                    {editor.error && (
                      <span className="form-error" role="alert">
                        {editor.error}
                      </span>
                    )}

                    <div className="deliverable-actions">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => editor.save(anchor.id)}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={editor.cancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {anchor.url ? (
                      <a
                        href={anchor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="deliverable-link"
                      >
                        Open {anchor.label}
                        <Icon name="external" size={15} />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <p className="muted">No link added yet.</p>
                    )}

                    <div className="deliverable-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        aria-label={`${anchor.url ? "Edit" : "Add"} link for ${anchor.label}`}
                        onClick={() => editor.startEditing(anchor)}
                      >
                        <Icon name="edit" size={15} />
                        {anchor.url ? "Edit link" : "Add link"}
                      </button>

                      {anchor.url && (
                        <button
                          type="button"
                          className="button button-secondary"
                          aria-label={`Remove link for ${anchor.label}`}
                          onClick={() => editor.remove(anchor.id)}
                        >
                          <Icon name="trash" size={15} />
                          Remove link
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =========================================================
   DELIVERABLES BAR (shown above the Kanban board)
   ========================================================= */

function DeliverablesBar({ anchors, setAnchors, onManage, notify }) {
  const editor = useAnchorEditor(setAnchors, notify);

  return (
    <section className="deliverables-bar" aria-labelledby="deliverables-bar-heading">
      <div className="deliverables-bar-heading">
        <Icon name="folder" size={18} />
        <strong id="deliverables-bar-heading">Deliverables</strong>
      </div>

      <ul className="deliverables-bar-list">
        {anchors.map((anchor) => {
          const isEditing = editor.editing === anchor.id;

          return (
            <li
              key={anchor.id}
              className={`deliverable-chip ${isEditing ? "editing" : ""}`}
            >
              <span className="deliverable-chip-label">{anchor.label}</span>

              {isEditing ? (
                <div className="deliverable-chip-edit">
                  <input
                    autoFocus
                    type="url"
                    value={editor.draft}
                    placeholder="https://..."
                    aria-label={`Link for ${anchor.label}`}
                    aria-invalid={Boolean(editor.error)}
                    onChange={editor.onInputChange}
                    onKeyDown={(event) =>
                      editor.onInputKeyDown(event, anchor.id)
                    }
                  />

                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => editor.save(anchor.id)}
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={editor.cancel}
                  >
                    Cancel
                  </button>

                  {editor.error && (
                    <span className="form-error" role="alert">
                      {editor.error}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  {anchor.url ? (
                    <a
                      href={anchor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="deliverable-chip-link"
                    >
                      Open
                      <Icon name="external" size={14} />
                      <span className="sr-only">
                        {` ${anchor.label} (opens in a new tab)`}
                      </span>
                    </a>
                  ) : (
                    <span className="deliverable-chip-empty">No link</span>
                  )}

                  <button
                    type="button"
                    className="icon-button"
                    title={anchor.url ? "Edit link" : "Add link"}
                    aria-label={`${anchor.url ? "Edit" : "Add"} link for ${anchor.label}`}
                    onClick={() => editor.startEditing(anchor)}
                  >
                    <Icon name={anchor.url ? "edit" : "plus"} size={15} />
                  </button>

                  {anchor.url && (
                    <button
                      type="button"
                      className="icon-button"
                      title="Remove link"
                      aria-label={`Remove link for ${anchor.label}`}
                      onClick={() => editor.remove(anchor.id)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" className="text-link-button" onClick={onManage}>
        Manage
        <Icon name="arrow" size={16} />
      </button>
    </section>
  );
}

/* =========================================================
   DISPLAY PANEL
   ========================================================= */

function DisplayPanel({ prefs, setPrefs, onClose, btnRef }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const size = clampSize(prefs.size);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        closeRef.current();
        btnRef?.current?.focus();
      }
    };

    const onOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        !btnRef?.current?.contains(event.target)
      ) {
        closeRef.current();
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [btnRef]);

  const update = (key, value) => {
    setPrefs((current) => ({ ...current, [key]: value }));
  };

  return (
    <div
      id="display-panel"
      className="display-panel"
      ref={panelRef}
      role="dialog"
      aria-labelledby="display-panel-title"
    >
      <div className="display-panel-heading">
        <div>
          <h2 id="display-panel-title">Display settings</h2>
          <p>Personalise your workspace.</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close display settings"
          onClick={() => {
            onClose();
            btnRef?.current?.focus();
          }}
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <fieldset className="setting-group">
        <legend className="setting-label">Appearance</legend>
        <div className="theme-options">
          {[
            ["light", "Light"],
            ["dark", "Dark"],
            ["contrast", "High contrast"],
          ].map(([value, label]) => (
            <label key={value} className={prefs.theme === value ? "selected" : ""}>
              <input
                type="radio"
                name="app-theme"
                value={value}
                checked={prefs.theme === value}
                onChange={() => update("theme", value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="setting-group">
        <span className="setting-label">Text size</span>
        <p className="setting-description">Adjust text across the tracker.</p>
        <div className="text-size-controls">
          <button
            type="button"
            aria-label="Decrease text size"
            disabled={size <= TEXT_SIZE_MIN}
            onClick={() => update("size", clampSize(size - TEXT_SIZE_STEP))}
          >
            A−
          </button>
          <strong role="status">{size}%</strong>
          <button
            type="button"
            className="text-size-reset"
            aria-label="Reset text size to 100 percent"
            disabled={size === TEXT_SIZE_DEFAULT}
            onClick={() => update("size", TEXT_SIZE_DEFAULT)}
          >
            Reset
          </button>
          <button
            type="button"
            aria-label="Increase text size"
            disabled={size >= TEXT_SIZE_MAX}
            onClick={() => update("size", clampSize(size + TEXT_SIZE_STEP))}
          >
            A+
          </button>
        </div>
      </div>

      <fieldset className="setting-group">
        <legend className="setting-label">Accessibility</legend>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={Boolean(prefs.easy)}
            onChange={(event) => update("easy", event.target.checked)}
          />
          <span className="setting-option-text">
            <strong>Easier reading</strong>
            <small>More spacing between text and content.</small>
          </span>
        </label>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={Boolean(prefs.calm)}
            onChange={(event) => update("calm", event.target.checked)}
          />
          <span className="setting-option-text">
            <strong>Reduce animations</strong>
            <small>Minimise motion and transitions.</small>
          </span>
        </label>
      </fieldset>

      <fieldset className="setting-group">
        <legend className="setting-label">Task colours</legend>
        <p className="setting-description">Labels and icons remain visible in both palettes.</p>
        <label className="setting-toggle colour-option">
          <input
            type="radio"
            name="palette"
            checked={prefs.palette !== "cb"}
            onChange={() => update("palette", "standard")}
          />
          <span className="setting-option-text">
            <strong>Standard</strong>
            <small>Red for bugs, green for features.</small>
          </span>
        </label>
        <label className="setting-toggle colour-option">
          <input
            type="radio"
            name="palette"
            checked={prefs.palette === "cb"}
            onChange={() => update("palette", "cb")}
          />
          <span className="setting-option-text">
            <strong>Colour-blind friendly</strong>
            <small>Orange for bugs, blue for features.</small>
          </span>
        </label>
      </fieldset>
    </div>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({
  activeView,
  onNavigate,
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
  total,
}) {
  // The mobile drawer always shows full labels, even if the desktop
  // sidebar was saved as collapsed.
  const compact = collapsed && !mobileOpen;

  const navigate = (view) => {
    onNavigate(view);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-mobile-backdrop"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
          "app-sidebar",
          collapsed ? "sidebar-collapsed" : "",
          mobileOpen ? "sidebar-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Project navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Icon name="board" size={21} />
            </div>

            {!compact && <strong>Project Tracker</strong>}
          </div>

          <button
            type="button"
            className="sidebar-mobile-close icon-button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="sidebar-nav">
          {!compact && (
            <div className="sidebar-section-label">WORKSPACE</div>
          )}

          <nav aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${
                  activeView === item.id ? "active" : ""
                }`}
                title={compact ? item.label : undefined}
                aria-label={compact ? item.label : undefined}
                aria-current={activeView === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <span className="sidebar-nav-icon">
                  <Icon name={item.icon} size={19} />
                </span>

                {!compact && (
                  <>
                    <span className="sidebar-nav-label">{item.label}</span>

                    {item.id === "tasks" && (
                      <span className="sidebar-count">{total}</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={18} />

            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   STAT CARD
   ========================================================= */

function StatCard({ label, value, caption, danger = false }) {
  return (
    <div className={`stat-card ${danger ? "stat-danger" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-caption">{caption}</div>
    </div>
  );
}

/* =========================================================
   TEAM VIEW
   ========================================================= */

const TEAM_ROLES = [
  "Software Architect", "Senior Developer", "Junior Developer",
  "Front-end Developer", "UX Designer", "QA Tester",
  "Project Manager", "Team member", "Other",
];

function TeamView({ tasks, members, project, onProject, onReset, onLoadExampleTasks, onEdit, onSaveMember, onRemoveMember }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", gitlab: "", role: "Team member" });
  const [error, setError] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [removing, setRemoving] = useState(null);
  const [expandedMember, setExpandedMember] = useState(null);
  // Open a full-width profile instead of squeezing all tasks into a small card.
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const removeDialogRef = useRef(null);

  function begin(member = null) {
    const next = member
      ? {
          name: member.name,
          email: member.email || "",
          gitlab: member.gitlab || "",
          role: member.role || "Team member",
        }
      : { name: "", email: "", gitlab: "", role: "Team member" };

    setEditingId(member ? member.id : "new");
    setForm({
      ...next,
      role: TEAM_ROLES.includes(next.role) ? next.role : "Other",
    });
    setCustomRole(TEAM_ROLES.includes(next.role) ? "" : next.role);
    setError("");
  }

  // Focus trap and Escape for the remove-member dialog.
  useEffect(() => {
    if (!removing) return undefined;

    const previous = document.activeElement;
    const dialog = removeDialogRef.current;

    dialog?.querySelector("button")?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setRemoving(null);
      }

      if (event.key === "Tab" && dialog) {
        const buttons = [...dialog.querySelectorAll("button:not([disabled])")];

        if (!buttons.length) return;

        const first = buttons[0];
        const last = buttons[buttons.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [removing]);

  function submit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      setError("Please enter a name.");
      return;
    }

    if (name.toLowerCase() === "unassigned") {
      setError(
        "Unassigned is reserved for tasks without an owner. Choose another name."
      );
      return;
    }

    if (
      members.some(
        (m) => m.name.toLowerCase() === name.toLowerCase() && m.id !== editingId
      )
    ) {
      setError("A team member with this name already exists.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address or leave it blank.");
      return;
    }

    const gitlab = form.gitlab.trim().replace(/^@/, "");
    if (gitlab && !/^[A-Za-z0-9_.-]{2,100}$/.test(gitlab)) {
      setError("GitLab usernames can contain letters, numbers, dots, dashes and underscores.");
      return;
    }

    const role = form.role === "Other" ? customRole.trim() : form.role.trim();

    if (!role) {
      setError("Enter a role when choosing Other.");
      return;
    }

    onSaveMember({
      id:
        editingId === "new"
          ? `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          : editingId,
      name,
      email,
      gitlab,
      role,
    });

    setEditingId(null);
  }

  const assigned = tasks.filter((task) => task.assignee !== "Unassigned").length;
  const unassigned = tasks.length - assigned;
  const selectedProfile = members.find((member) => member.id === selectedProfileId);

  // A dedicated, responsive profile page makes every assigned task visible.
  // It reads live tasks/members and never changes saved data.
  if (selectedProfile) {
    const profileTasks = tasks.filter((task) => task.assignee === selectedProfile.name);
    const completed = profileTasks.filter((task) => task.status === "done").length;
    const inProgress = profileTasks.filter((task) => task.status === "in-progress").length;
    const review = profileTasks.filter((task) => task.status === "review").length;
    const completion = profileTasks.length
      ? Math.round((completed / profileTasks.length) * 100)
      : 0;
    const orderedTasks = [...profileTasks].sort((a, b) => {
      const stageOrder = { "in-progress": 0, review: 1, todo: 2, done: 3 };
      return (stageOrder[a.status] ?? 4) - (stageOrder[b.status] ?? 4) || compareTaskPriority(a, b);
    });

    return (
      <section className="view-panel member-profile" aria-labelledby="member-profile-heading">
        <div className="member-profile-navigation">
          <button type="button" className="button button-secondary" onClick={() => setSelectedProfileId(null)}>
            <Icon name="chevronLeft" size={17} /> Back to all team members
          </button>
        </div>
        <div className="member-profile-header">
          <span className="member-profile-avatar" aria-hidden="true">{initialsOf(selectedProfile.name)}</span>
          <div className="member-profile-heading-group">
            <span className="project-kicker">TEAM MEMBER PROFILE</span>
            <h3 id="member-profile-heading">{selectedProfile.name}</h3>
            <p className="member-profile-role">{selectedProfile.role || "Team member"}</p>
            {selectedProfile.email && <a href={`mailto:${selectedProfile.email}`}>{selectedProfile.email}</a>}
            {selectedProfile.gitlab && (
              <a href={`https://gitlab.com/${encodeURIComponent(selectedProfile.gitlab)}`}
                target="_blank" rel="noopener noreferrer">
                GitLab: {selectedProfile.gitlab}<span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
        <div className="member-profile-summary" aria-label={`${selectedProfile.name} workload overview`}>
          <div><strong>{profileTasks.length}</strong><span>Assigned tasks</span></div>
          <div><strong>{inProgress}</strong><span>In progress</span></div>
          <div><strong>{review}</strong><span>In review</span></div>
          <div><strong>{completed}</strong><span>Completed</span></div>
        </div>
        <div className="member-profile-completion">
          <div className="team-member-progress-label"><span>Task completion</span><strong>{completion}%</strong></div>
          <div className="progress-track" role="progressbar"
            aria-label={`${selectedProfile.name} task completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
            <div style={{ width: `${completion}%` }} />
          </div>
        </div>
        <div className="member-profile-tasks-heading">
          <div>
            <h4>Assigned tasks ({profileTasks.length})</h4>
            <p>All tasks assigned to {selectedProfile.name}, including their status, priority and deadlines.</p>
          </div>
        </div>
        {orderedTasks.length ? (
          <div className="member-profile-task-grid">
            {orderedTasks.map((task) => {
              const due = dueInfo(task);
              const type = TYPES[task.type] || TYPES.feature;
              return (
                <article className="member-profile-task" key={task.id}>
                  <div className="member-profile-task-top">
                    <span className="task-id">{task.id}</span>
                    <span className={`team-task-status status-${task.status}`}>{stageLabel(task.status)}</span>
                  </div>
                  <h5>{task.title}</h5>
                  {task.description && <p className="member-profile-task-description">{task.description}</p>}
                  <div className="member-profile-task-badges">
                    <span className={`task-type type-${task.type}`}><span aria-hidden="true">{type.glyph}</span>{type.label}</span>
                    <span className={`priority-chip priority-${taskPriority(task)}`}>{priorityLabel(task)} priority</span>
                    <span className={`date-chip date-${due.state}`}><Icon name="calendar" size={14} />{due.label}</span>
                  </div>
                  {hasContext(task) && (
                    <details className="member-profile-context">
                      <summary>View AI Prompt Context</summary>
                      <pre>{task.context}</pre>
                    </details>
                  )}
                  <button type="button" className="button button-secondary member-profile-open-task"
                    onClick={() => onEdit(task)}>
                    <Icon name="edit" size={16} /> View / edit task
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="view-empty-state"><strong>No tasks assigned yet</strong>
            <p>Assign tasks to {selectedProfile.name} using the task editor.</p></div>
        )}
      </section>
    );
  }

  return (
    <section className="view-panel" aria-labelledby="team-heading">
      <div className="view-toolbar">
        <div>
          <h3 id="team-heading">Team members</h3>
          <p>{members.length} team members · Assign responsibilities and follow progress.</p>
        </div>

        <div className="view-toolbar-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => begin()}
          >
            <Icon name="plus" size={17} />
            Add team member
          </button>
        </div>
      </div>

      <div className="project-bar" aria-label="Project details">
        <div className="project-bar-intro">
          <span className="project-kicker">CURRENT WORKSPACE</span>
          <strong>Project details</strong>
          <span>Changes save automatically</span>
        </div>
        <label className="project-field">
          <span>Team name</span>
          <input value={project.team} maxLength={60}
            onChange={(e) => onProject({ ...project, team: e.target.value })} />
        </label>
        <label className="project-field project-field-wide">
          <span>Project name</span>
          <input value={project.project} maxLength={80}
            onChange={(e) => onProject({ ...project, project: e.target.value })} />
        </label>
      </div>

      {editingId !== null && (
        <form className="member-editor" onSubmit={submit} noValidate>
          <h4>{editingId === "new" ? "Add team member" : "Edit team member"}</h4>

          <div className="member-fields">
            <label>
              Name
              <input
                autoFocus
                value={form.name}
                maxLength={80}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </label>

            <label>
              Email (optional)
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </label>

            <label>
              GitLab username (optional)
              <input value={form.gitlab} maxLength={100}
                onChange={(e) => setForm({ ...form, gitlab: e.target.value })}
                placeholder="e.g. jane-doe" />
            </label>

            <label>
              Role
              <select
                value={TEAM_ROLES.includes(form.role) ? form.role : "Other"}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {TEAM_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              {(form.role === "Other" || !TEAM_ROLES.includes(form.role)) && (
                <input
                  aria-label="Custom role"
                  value={customRole}
                  maxLength={80}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="e.g. Accessibility Specialist"
                />
              )}
            </label>
          </div>

          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}

          <div className="member-actions">
            <button className="button button-primary" type="submit">
              Save member
            </button>

            <button
              className="button button-secondary"
              type="button"
              onClick={() => setEditingId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="team-summary" aria-label="Team overview">
        <div>
          <strong>{members.length}</strong>
          <span>Team members</span>
        </div>

        <div>
          <strong>{assigned}</strong>
          <span>Assigned tasks</span>
        </div>

        <div>
          <strong>{unassigned}</strong>
          <span>Unassigned tasks</span>
        </div>
      </div>

      <div className="team-grid">
        {members.map((member) => {
          const memberTasks = tasks.filter(
            (task) => task.assignee === member.name
          );
          const done = memberTasks.filter((t) => t.status === "done").length;
          const active = memberTasks.filter(
            (t) => t.status === "in-progress"
          ).length;
          const progress = memberTasks.length
            ? Math.round((done / memberTasks.length) * 100)
            : 0;
          const expanded = expandedMember === member.id;

          return (
            <article className="team-card" key={member.id}>
              <div className="team-member-top">
                <span className="team-member-avatar" aria-hidden="true">
                  {initialsOf(member.name)}
                </span>

                <div className="team-member-identity">
                  <h4><button type="button" className="team-member-profile-link"
                    onClick={() => setSelectedProfileId(member.id)}
                    aria-label={`View ${member.name}'s full profile`}>
                    {member.name}
                  </button></h4>
                  <p>{member.role || "Team member"}</p>

                  {member.email && (
                    <a
                      className="team-member-email"
                      href={`mailto:${member.email}`}
                    >
                      {member.email}
                    </a>
                  )}

                  {member.gitlab && (
                    <a className="team-member-email"
                      href={`https://gitlab.com/${encodeURIComponent(member.gitlab)}`}
                      target="_blank" rel="noopener noreferrer">
                      GitLab: {member.gitlab}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="team-member-stats">
                <div>
                  <strong>{memberTasks.length}</strong>
                  <span>Assigned</span>
                </div>

                <div>
                  <strong>{active}</strong>
                  <span>In progress</span>
                </div>

                <div>
                  <strong>{done}</strong>
                  <span>Completed</span>
                </div>
              </div>

              <div className="team-member-progress-label">
                <span>Completion</span>
                <strong>{progress}%</strong>
              </div>

              <div
                className="progress-track"
                role="progressbar"
                aria-label={`${member.name} task completion`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div style={{ width: `${progress}%` }} />
              </div>

              <button type="button" className="button button-primary team-profile-open-button"
                onClick={() => setSelectedProfileId(member.id)}>
                View full profile <Icon name="arrow" size={16} />
              </button>
              <div className="team-member-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  aria-label={`Edit ${member.name}`}
                  onClick={() => begin(member)}
                >
                  <Icon name="edit" size={15} />
                  Edit
                </button>

                <button
                  className="button team-remove-button"
                  type="button"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => setRemoving(member)}
                >
                  <Icon name="trash" size={15} />
                  Remove
                </button>
              </div>

              <div className="team-member-tasks">
                <button
                  type="button"
                  className="team-member-tasks-toggle"
                  aria-expanded={expanded}
                  onClick={() => setExpandedMember(expanded ? null : member.id)}
                >
                  <span>
                    {expanded
                      ? "Hide assigned tasks"
                      : `View assigned tasks (${memberTasks.length})`}
                  </span>
                  <Icon name="chevron" size={16} />
                </button>

                {expanded && (
                  <div className="team-task-list">
                    {memberTasks.length ? (
                      memberTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className="team-task-item"
                          onClick={() => onEdit(task)}
                        >
                          <span>
                            <small>{task.id}</small>
                            <strong>{task.title}</strong>
                          </span>

                          <span
                            className={`team-task-status status-${task.status}`}
                          >
                            {stageLabel(task.status)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="team-member-no-tasks">
                        No tasks assigned yet. Use a task's Assignee field to
                        assign one.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="view-empty-state">
          <strong>No team members yet</strong>
          <p>Add your first member to start assigning tasks.</p>

          <button
            type="button"
            className="button button-primary"
            onClick={() => begin()}
          >
            Add team member
          </button>
        </div>
      )}

      {removing && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRemoving(null);
          }}
        >
          <div
            ref={removeDialogRef}
            className="task-modal confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-member-title"
            aria-describedby="remove-member-description"
          >
            <div className="modal-header">
              <h2 id="remove-member-title">Remove {removing.name}?</h2>
            </div>

            <div className="confirm-body">
              <p id="remove-member-description">
                The member will be removed. Their tasks will be kept and marked
                Unassigned.
              </p>
            </div>

            <div className="modal-footer">
              <span />

              <div className="modal-footer-right">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setRemoving(null)}
                >
                  Cancel
                </button>

                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => {
                    onRemoveMember(removing);
                    setRemoving(null);
                  }}
                >
                  Remove member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   CALENDAR VIEW
   ========================================================= */

function CalendarView({ tasks, onEdit }) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selected, setSelected] = useState(() => today());

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const start = (month.getDay() + 6) % 7; // weeks start on Monday
  const length = new Date(year, monthIndex + 1, 0).getDate();
  const slots = Math.ceil((start + length) / 7) * 7;
  const todayIso = today();

  const dated = tasks.filter((task) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || "")) return false;

    const date = new Date(`${task.dueDate}T00:00:00`);

    return Number.isFinite(date.getTime()) && dateISO(date) === task.dueDate;
  });

  const byDate = new Map();

  dated.forEach((task) => {
    if (!byDate.has(task.dueDate)) byDate.set(task.dueDate, []);
    byDate.get(task.dueDate).push(task);
  });

  const selectedTasks = byDate.get(selected) || [];
  const undated = tasks.length - dated.length;
  const monthLabel = month.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Keep the selected date inside the displayed month when navigating.
  const changeMonth = (offset) => {
    const next = new Date(year, monthIndex + offset, 1);
    setMonth(next);
    setSelected(dateISO(next));
  };

  return (
    <section className="view-panel" aria-labelledby="calendar-heading">
      <div className="view-toolbar">
        <div>
          <h3 id="calendar-heading">Task calendar</h3>
          <p>
            Tasks appear on their due dates. Select a date or open a task to
            edit it.
          </p>
        </div>

        <div className="calendar-navigation">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            <Icon name="chevronLeft" size={18} />
          </button>

          <strong aria-live="polite">{monthLabel}</strong>

          <button
            type="button"
            className="button button-secondary"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            <Icon name="chevronRight" size={18} />
          </button>

          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setMonth(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              );
              setSelected(today());
            }}
          >
            Today
          </button>
        </div>
      </div>

      <div
        className="calendar-scroll"
        role="region"
        aria-label="Calendar month grid"
        tabIndex={0}
      >
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div className="calendar-weekday" key={day}>
              {day}
            </div>
          ))}

          {Array.from({ length: slots }, (_, index) => {
            const day = index - start + 1;

            if (day < 1 || day > length) {
              return (
                <div
                  className="calendar-cell calendar-blank"
                  key={index}
                  aria-hidden="true"
                />
              );
            }

            const iso = dateISO(new Date(year, monthIndex, day));
            const items = byDate.get(iso) || [];

            return (
              <div
                className={`calendar-cell ${
                  iso === selected ? "calendar-selected" : ""
                } ${iso === todayIso ? "calendar-today" : ""}`}
                key={iso}
              >
                <button
                  type="button"
                  className="calendar-day"
                  onClick={() => setSelected(iso)}
                  aria-label={`${day} ${monthLabel}, ${items.length} ${
                    items.length === 1 ? "task" : "tasks"
                  }`}
                  aria-pressed={iso === selected}
                >
                  {day}
                </button>

                {items.slice(0, 3).map((task) => (
                  <button
                    type="button"
                    key={task.id}
                    className={`calendar-task ${
                      task.status === "done" ? "calendar-task-done" : ""
                    } ${
                      dueInfo(task).state === "overdue"
                        ? "calendar-task-overdue"
                        : ""
                    }`}
                    title={task.title}
                    onClick={() => onEdit(task)}
                  >
                    {task.title}
                  </button>
                ))}

                {items.length > 3 && (
                  <button
                    type="button"
                    className="calendar-more"
                    onClick={() => setSelected(iso)}
                  >
                    +{items.length - 3} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="calendar-day-details" aria-live="polite">
        <div className="calendar-detail-header">
          <div>
            <span className="calendar-detail-eyebrow">SELECTED DATE</span>
            <h3>
              {new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
          </div>

          <span className="calendar-detail-count">
            {selectedTasks.length}{" "}
            {selectedTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="calendar-empty-day">
            <span className="calendar-empty-icon" aria-hidden="true">
              <Icon name="calendar" size={22} />
            </span>

            <div>
              <strong>Nothing scheduled</strong>
              <p>
                No tasks are due on this day. Choose another date to see
                upcoming work.
              </p>
            </div>
          </div>
        ) : (
          <ul className="calendar-selected-tasks">
            {selectedTasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="calendar-detail-task"
                  onClick={() => onEdit(task)}
                >
                  <span className="calendar-detail-task-main">
                    <strong>{task.title}</strong>
                    <small>
                      {task.id} · {stageLabel(task.status)} ·{" "}
                      {priorityLabel(task)} priority
                    </small>
                  </span>

                  <Icon name="chevronRight" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {undated > 0 && (
        <div className="calendar-note">
          <Icon name="calendar" size={16} />
          <span>
            {undated} {undated === 1 ? "task has" : "tasks have"} no due date
            and {undated === 1 ? "is" : "are"} not shown here.
          </span>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   KEYBOARD SHORTCUT GUIDE
   ========================================================= */

function ShortcutsDialog({ onClose }) {
  const closeButton = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;

    closeButton.current?.focus();

    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation?.();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKey, true);

    return () => {
      document.removeEventListener("keydown", handleKey, true);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="modal-header">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>

          <button
            ref={closeButton}
            type="button"
            className="icon-button"
            aria-label="Close shortcuts"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <dl>
          <div>
            <dt>
              <kbd>N</kbd>
            </dt>
            <dd>New task</dd>
          </div>

          <div>
            <dt>
              <kbd>/</kbd>
            </dt>
            <dd>Focus task search</dd>
          </div>

          <div>
            <dt>
              <kbd>?</kbd>
            </dt>
            <dd>Show shortcuts</dd>
          </div>

          <div>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>Close the open dialog or menu</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */

function TrackerApp({ user, onLogout }) {
  const guest = user.guest === true;
  const storageKey = (key) => guest ? `pt.guest.${key}` : key;
  /* ---------- Storage warning ----------
     Declared first so the listener is attached before any
     saved-data effects below run. */

  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    const onStorage = (event) => {
      setStorageError(!event.detail?.ok);
    };

    window.addEventListener("pt-storage", onStorage);

    return () => {
      window.removeEventListener("pt-storage", onStorage);
    };
  }, []);

  /* ---------- Saved data ---------- */

  // Versioned keys migrate old demo data once without resetting future edits.
  const [storedTasks, setTasks] = useLocalStorage(
    storageKey("pt.tasks.v16"),
    guest ? () => SEED_TASKS.map((task) => ({ ...task })) : initialTasksWithMigration,
    sanitizeTasks
  );

  const [anchors, setAnchorsRaw] = useLocalStorage(
    storageKey("pt.anchors.v5"),
    SEED_ANCHORS,
    normalizeAnchors
  );

  // Every change is normalized, so there are always exactly four deliverables.
  const setAnchors = (update) => {
    setAnchorsRaw((current) => {
      const base = normalizeAnchors(current);

      return normalizeAnchors(
        typeof update === "function" ? update(base) : update
      );
    });
  };

  const [prefs, setPrefs] = useLocalStorage(
    storageKey("pt.prefs.v5"),
    defaultPrefs(),
    sanitizePrefs
  );

  const [teamMembers, setTeamMembers] = useLocalStorage(
    storageKey("pt.team.v13"),
    guest ? () => STARTER_TEAM.map((member) => ({ ...member })) : initialTeamWithMigration,
    (value, fallback) =>
      Array.isArray(value)
        ? value
            .filter(
              (member) =>
                member &&
                typeof member.name === "string" &&
                member.name.trim()
            )
            .map((member) => ({
              id: String(member.id || member.name),
              name: member.name.trim(),
              email: String(member.email || ""),
              gitlab: String(member.gitlab || ""),
              role: String(member.role || "Team member"),
            }))
        : fallback
  );

  const [project, setProject] = useLocalStorage(
    storageKey("pt.project.v1"),
    { team: "Website Development Team", project: "Website Development Project" },
    (value, fallback) => isPlainObject(value)
      ? { team: String(value.team ?? fallback.team), project: String(value.project ?? fallback.project) }
      : fallback
  );

  const memberNames = teamMembers.map((member) => member.name);
  const assignableMembers = ["Unassigned", ...memberNames];

  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    storageKey("pt.sidebar.collapsed.v1"),
    false,
    (value) => Boolean(value)
  );

  const [lastId, setLastId] = useLocalStorage(
    storageKey("pt.lastId.v1"),
    0,
    (value, fallback) =>
      Number.isFinite(Number(value)) ? Number(value) : fallback
  );

  /* ---------- App state ---------- */

  const [activeView, setActiveView] = useState("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const [filters, setFilters] = useState({
    priority: "all",
    status: "all",
    assignee: "all",
    type: "all",
  });

  const toastTimer = useRef(null);
  const displayButtonRef = useRef(null);
  const searchInputRef = useRef(null);
  const headingRef = useRef(null);
  const mounted = useRef(false);

  /* ---------- Normalize saved tasks ---------- */

  const tasks = useMemo(
    () =>
      (Array.isArray(storedTasks) ? storedTasks : []).map((task) => ({
        context: TEMPLATE,
        contextTool: "",
        contextUpdatedAt: null,
        priority: "medium",
        ...task,
      })),
    [storedTasks]
  );

  /* ---------- Page setup ---------- */

  useEffect(() => {
    document.title = APP_NAME;

    if (!document.documentElement.lang) {
      document.documentElement.lang = "en";
    }

    return () => {
      clearTimeout(toastTimer.current);
    };
  }, []);

  // When the page changes, move keyboard / screen-reader focus to its heading.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    // Never steal focus while the person is typing in search.
    if (document.activeElement?.closest?.("input, textarea")) {
      return;
    }

    headingRef.current?.focus({ preventScroll: true });
  }, [activeView]);

  /* ---------- Keyboard shortcuts ---------- */

  useEffect(() => {
    const onShortcut = (event) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.isComposing
      ) {
        return;
      }

      const target = event.target;

      if (
        target?.closest?.(
          'input, textarea, select, [contenteditable="true"], [role="textbox"]'
        )
      ) {
        return;
      }

      if (
        editing ||
        deleteTarget ||
        displayOpen ||
        shortcutsOpen ||
        document.querySelector('[role="dialog"], [role="alertdialog"]')
      ) {
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNew();
      } else if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener("keydown", onShortcut);

    return () => document.removeEventListener("keydown", onShortcut);
  });

  useEffect(() => {
    function onEscape(event) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
        setDeleteTarget(null);
      }
    }

    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  /* ---------- Notifications ---------- */

  function notify(message) {
    setToast(message);

    clearTimeout(toastTimer.current);

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 3000);
  }

  function loadExampleTasksOnly() {
    if (!window.confirm(
      "Replace all existing tasks with 21 realistic demonstration tasks? Team members, their contact details and project settings will be kept. Existing task edits will be lost."
    )) return;
    setTasks(SEED_TASKS);
    setLastId(0);
    setFilters({ priority: "all", status: "all", assignee: "all", type: "all" });
    setSearch("");
    notify(`Loaded ${SEED_TASKS.length} example tasks; team profiles preserved`);
  }

  function resetSampleData() {
    if (!window.confirm(
      "Load the updated demonstration workload? This replaces all tasks and team members. Your existing tasks and member edits will be lost. Continue?"
    )) return;
    setTasks(SEED_TASKS);
    setTeamMembers(STARTER_TEAM);
    setLastId(0);
    setFilters({ priority: "all", status: "all", assignee: "all", type: "all" });
    setSearch("");
    notify(`Demonstration data restored: ${SEED_TASKS.length} tasks and ${STARTER_TEAM.length} members`);
  }

  /* ---------- Task management ---------- */

  function nextId() {
    const largest = Math.max(lastId, 0, ...tasks.map(idNumber));

    return `TASK-${String(largest + 1).padStart(3, "0")}`;
  }

  function openNew(status = "todo") {
    setEditing({
      id: nextId(),
      title: "",
      description: "",
      type: "feature",
      priority: "medium",
      status,
      assignee: "Unassigned",
      dueDate: null,
      createdDate: today(),
      createdAt: new Date().toISOString(),
      context: TEMPLATE,
      contextTool: "",
      contextUpdatedAt: null,
    });

    setIsCreating(true);
  }

  function openEdit(task) {
    setEditing(task);
    setIsCreating(false);
  }

  function closeModal() {
    setEditing(null);
    setIsCreating(false);
  }

  function saveTask(task) {
    if (isCreating) {
      setLastId((current) => Math.max(current, idNumber(task)));
    }

    setTasks((current) =>
      isCreating
        ? [...current, task]
        : current.map((item) => (item.id === task.id ? task : item))
    );

    notify(isCreating ? "Task created successfully" : "Changes saved");
    closeModal();
  }

  // Card menu: ask first.
  function deleteTask(task) {
    setDeleteTarget(task);
  }

  // Does the actual delete (the task editor has its own inline confirm).
  function performDelete(task) {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setDeleteTarget(null);
    notify("Task deleted");
    closeModal();
  }

  function moveTask(task, status) {
    if (task.status === status) return;

    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status } : item))
    );

    notify(`Moved to ${stageLabel(status)}`);
  }

  function handOffTask(task, assignee) {
    if (task.assignee === assignee) return;

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, assignee } : item
      )
    );

    notify(`Assigned to ${assignee}`);
  }

  function saveTeamMember(member) {
    const previous = teamMembers.find((item) => item.id === member.id);

    setTeamMembers((current) =>
      previous
        ? current.map((item) => (item.id === member.id ? member : item))
        : [...current, member]
    );

    // If a member is renamed, keep their tasks attached to them.
    if (previous && previous.name !== member.name) {
      setTasks((current) =>
        current.map((task) =>
          task.assignee === previous.name
            ? { ...task, assignee: member.name }
            : task
        )
      );

      setFilters((current) =>
        current.assignee === previous.name
          ? { ...current, assignee: member.name }
          : current
      );
    }

    notify(previous ? "Team member updated" : "Team member added");
  }

  function removeTeamMember(member) {
    setTeamMembers((current) =>
      current.filter((item) => item.id !== member.id)
    );

    setTasks((current) =>
      current.map((task) =>
        task.assignee === member.name
          ? { ...task, assignee: "Unassigned" }
          : task
      )
    );

    setFilters((current) =>
      current.assignee === member.name
        ? { ...current, assignee: "all" }
        : current
    );

    notify("Team member removed; their tasks are now unassigned");
  }

  /* ---------- Statistics ---------- */

  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "in-progress").length;
  const overdue = tasks.filter((task) => dueInfo(task).state === "overdue").length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  /* ---------- Search and filtering ---------- */

  const searchQuery = search.trim().toLowerCase();

  function matchesSearch(task) {
    return (
      !searchQuery ||
      [task.id, task.title, task.description, task.assignee].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(searchQuery)
      )
    );
  }

  // The board shows every task. Only the header search narrows it.
  const boardTasks = tasks.filter(matchesSearch);

  // All Tasks uses the search AND the filter bar.
  const filtersActive =
    searchQuery !== "" ||
    Object.values(filters).some((value) => value !== "all");

  const filteredTasks = tasks.filter(
    (task) =>
      matchesSearch(task) &&
      (filters.priority === "all" || taskPriority(task) === filters.priority) &&
      (filters.status === "all" || task.status === filters.status) &&
      (filters.assignee === "all" || task.assignee === filters.assignee) &&
      (filters.type === "all" || task.type === filters.type)
  );

  /* ---------- Navigation ---------- */

  const currentPage =
    NAV_ITEMS.find((item) => item.id === activeView) || NAV_ITEMS[0];

  function navigateTo(view) {
    window.scrollTo({ top: 0, behavior: "auto" });
    setActiveView(view);
    setMobileSidebarOpen(false);
    setDragOver(null);
  }

  /* ---------- Task filters (All Tasks page only) ---------- */

  function renderTaskFilters() {
    const assignees = [
      ...new Set([...assignableMembers, ...tasks.map((task) => task.assignee)]),
    ].filter(Boolean);

    function updateFilter(name, value) {
      setFilters((current) => ({ ...current, [name]: value }));
    }

    return (
      <section className="task-filter-bar" aria-label="Task filters">
        <div className="task-filter-heading">
          <Icon name="filter" size={18} />
          <strong>Filters</strong>
        </div>

        <label className="task-filter-field">
          <span>Priority</span>

          <select
            value={filters.priority}
            onChange={(event) => updateFilter("priority", event.target.value)}
          >
            <option value="all">All priorities</option>

            {Object.entries(PRIORITIES).map(([key, priority]) => (
              <option key={key} value={key}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>

        <label className="task-filter-field">
          <span>Status</span>

          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            <option value="all">All statuses</option>

            {STAGES.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>

        <label className="task-filter-field">
          <span>Assignee</span>

          <select
            value={filters.assignee}
            onChange={(event) => updateFilter("assignee", event.target.value)}
          >
            <option value="all">Everyone</option>

            {assignees.map((member) => (
              <option key={member} value={member}>
                {member}
              </option>
            ))}
          </select>
        </label>

        <label className="task-filter-field">
          <span>Type</span>

          <select
            value={filters.type}
            onChange={(event) => updateFilter("type", event.target.value)}
          >
            <option value="all">All types</option>

            {Object.entries(TYPES).map(([key, type]) => (
              <option key={key} value={key}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="button button-secondary"
          disabled={!filtersActive}
          onClick={() => {
            setFilters({
              priority: "all",
              status: "all",
              assignee: "all",
              type: "all",
            });
            setSearch("");
          }}
        >
          Clear filters
        </button>

        <span className="filter-results" role="status" aria-live="polite">
          Showing {filteredTasks.length} of {total} tasks
        </span>
      </section>
    );
  }

  /* ---------- Kanban board ---------- */

  function renderBoard() {
    return (
      <>
        <div className="board-heading">
          <div>
            <h3>Workflow</h3>
            <p>Drag tasks between columns or use the card menu to change status.</p>
          </div>

          <div className="board-heading-actions">
            {searchQuery && (
              <span className="board-search-note" role="status" aria-live="polite">
                {boardTasks.length} of {total} tasks match your search
              </span>
            )}
            <details className="board-legend">
              <summary aria-label="Show task colour key">Colour key</summary>
              <div className="board-legend-popover">
                <strong>Task type</strong>
                <div><span className="task-type type-bug">◆ Bug</span><span>Issue to resolve</span></div>
                <div><span className="task-type type-feature">✦ Feature</span><span>Planned functionality</span></div>
                <strong>Deadlines</strong>
                <div><span className="date-chip date-overdue">Overdue</span><span>Past due date</span></div>
                <div><span className="date-chip date-urgent">Due today / tomorrow</span><span>Immediate attention</span></div>
                <div><span className="date-chip date-soon">Due soon</span><span>Approaching deadline</span></div>
              </div>
            </details>
          </div>
        </div>

        <p className="board-mobile-hint">
          Scroll sideways to see all four stages. Use each task's actions menu
          to move it without dragging.
        </p>

        <div
          id="task-board"
          className="kanban-board"
          role="region"
          aria-label="Kanban task board"
          tabIndex={0}
        >
          {STAGES.map((stage) => {
            const stageTasks = boardTasks
              .filter((task) => task.status === stage.id)
              .sort(compareTaskPriority);

            return (
              <section
                key={stage.id}
                className={`kanban-column ${
                  dragOver === stage.id ? "drag-over" : ""
                }`}
                aria-labelledby={`column-${stage.id}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOver(stage.id);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setDragOver(null);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(null);

                  const id = event.dataTransfer.getData("text/plain");
                  const task = tasks.find((item) => item.id === id);

                  if (task) {
                    moveTask(task, stage.id);
                  }
                }}
              >
                <div className="column-heading">
                  <div className="column-heading-left">
                    <span
                      className={`column-indicator indicator-${stage.id}`}
                      aria-hidden="true"
                    >
                      {stage.icon}
                    </span>

                    <h4 id={`column-${stage.id}`}>{stage.label}</h4>

                    <span className="column-count">
                      {stageTasks.length}
                      <span className="sr-only"> tasks</span>
                    </span>
                  </div>
                </div>

                <ul className="column-tasks">
                  {stageTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      members={assignableMembers}
                      onEdit={openEdit}
                      onMove={moveTask}
                      onHandOff={handOffTask}
                      onDelete={deleteTask}
                      notify={notify}
                    />
                  ))}

                  {stageTasks.length === 0 && (
                    <li className="column-empty">
                      <span className="empty-icon" aria-hidden="true">
                        <Icon name="board" size={22} />
                      </span>

                      <strong>
                        {searchQuery ? "No matching tasks" : "No tasks here"}
                      </strong>

                      <span>
                        {searchQuery
                          ? "Clear the search to see more."
                          : "Drag a task into this column."}
                      </span>
                    </li>
                  )}
                </ul>

                <button
                  type="button"
                  className="column-add"
                  onClick={() => openNew(stage.id)}
                >
                  <Icon name="plus" size={16} />
                  Add task
                  <span className="sr-only"> to {stage.label}</span>
                </button>
              </section>
            );
          })}
        </div>
      </>
    );
  }

  /* ---------- Overview ---------- */

  function renderOverview() {
    const recentTasks = [...tasks]
      .sort(
        (a, b) =>
          (b.createdAt || "").localeCompare(a.createdAt || "") ||
          idNumber(b) - idNumber(a)
      )
      .slice(0, 5);

    const attentionTasks = tasks
      .filter((task) => task.status !== "done")
      .filter((task) => {
        const state = dueInfo(task).state;
        return state === "overdue" || state === "urgent" || state === "soon";
      })
      .sort(byDueDate)
      .slice(0, 5);

    return (
      <>
        <div className="summary-grid">
          <StatCard label="Total tasks" value={total} caption="Across all stages" />
          <StatCard
            label="In progress"
            value={inProgress}
            caption="Currently being worked on"
          />
          <StatCard label="Completed" value={completed} caption="Finished tasks" />
          <StatCard
            label="Overdue"
            value={overdue}
            caption="Need attention"
            danger={overdue > 0}
          />
        </div>

        <div className="overview-details-grid">
          <section
            className="overview-panel"
            aria-labelledby="overview-progress-heading"
          >
            <div className="section-heading">
              <div>
                <h3 id="overview-progress-heading">Project progress</h3>
                <p>Current status across your board</p>
              </div>
            </div>

            <div className="overview-progress-large">
              <strong>{progress}%</strong>
              <span>of tasks completed</span>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Overall project completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div style={{ width: `${progress}%` }} />
            </div>

            <div className="stage-breakdown">
              {STAGES.map((stage) => (
                <div className="stage-breakdown-row" key={stage.id}>
                  <span>
                    <span
                      className={`column-indicator indicator-${stage.id}`}
                      aria-hidden="true"
                    >
                      {stage.icon}
                    </span>
                    {stage.label}
                  </span>

                  <strong>
                    {tasks.filter((task) => task.status === stage.id).length}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section
            className="overview-panel"
            aria-labelledby="overview-recent-heading"
          >
            <div className="section-heading">
              <div>
                <h3 id="overview-recent-heading">Recent tasks</h3>
                <p>Quickly jump back into your work</p>
              </div>

              <button
                type="button"
                className="text-link-button"
                onClick={() => navigateTo("tasks")}
              >
                View all
                <Icon name="arrow" size={16} />
              </button>
            </div>

            <div className="recent-task-list">
              {recentTasks.length === 0 ? (
                <p className="view-empty-message">No tasks found.</p>
              ) : (
                recentTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="recent-task-item"
                    onClick={() => openEdit(task)}
                  >
                    <span className="recent-task-main">
                      <small>{task.id}</small>
                      <strong>{task.title}</strong>
                    </span>

                    <span className={`team-task-status status-${task.status}`}>
                      {stageLabel(task.status)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        <section
          className="overview-panel"
          aria-labelledby="overview-attention-heading"
        >
          <div className="section-heading">
            <div>
              <h3 id="overview-attention-heading">Needs attention</h3>
              <p>Overdue or due within the next few days</p>
            </div>
          </div>

          <div className="recent-task-list">
            {attentionTasks.length === 0 ? (
              <p className="view-empty-message">
                Nothing is overdue or due soon.
              </p>
            ) : (
              attentionTasks.map((task) => {
                const due = dueInfo(task);

                return (
                  <button
                    key={task.id}
                    type="button"
                    className="recent-task-item"
                    onClick={() => openEdit(task)}
                  >
                    <span className="recent-task-main">
                      <small>{task.id}</small>
                      <strong>{task.title}</strong>
                    </span>

                    <span className={`date-chip date-${due.state}`}>
                      {due.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </>
    );
  }

  /* ---------- Page text ---------- */

  const PAGE_TEXT = {
    overview: [
      "Project overview",
      "Track progress and keep your project on course.",
    ],
    board: ["Kanban board", "Move work forward with your Kanban board."],
    tasks: ["All tasks", "Manage all project tasks in one place."],
    calendar: ["Calendar", "See your tasks and deadlines by date."],
    team: ["Team", "Understand team workload and progress."],
    deliverables: [
      "Deliverables",
      "Keep your important project resources together.",
    ],
  };

  const [pageTitle, pageSubtitle] = PAGE_TEXT[activeView] || PAGE_TEXT.overview;

  const textScale = clampSize(prefs.size) / 100;

  /* ---------- Render ---------- */

  return (
    <div
      style={{ "--text-scale": textScale }}
      className={[
        "tracker",
        `theme-${prefs.theme}`,
        prefs.easy ? "easy-reading" : "",
        prefs.calm ? "reduced-motion" : "",
        prefs.palette === "cb" ? "palette-cb" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <style>{CSS}</style>

      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Sidebar
        activeView={activeView}
        onNavigate={navigateTo}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        total={total}
      />

      <div className="app-workspace">
        <header className="app-header">
          <div className="header-left">
            <button
              type="button"
              className="icon-button mobile-menu-button"
              aria-label="Open navigation menu"
              aria-expanded={mobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Icon name="menu" size={22} />
            </button>

            <div className="app-brand">
              <p className="app-brand-name">{APP_NAME}</p>
              <span>{currentPage.label} · {project.team}</span>
            </div>
          </div>

          <div className="header-right">
            <div className="header-search">
              <Icon name="search" size={17} />

              <input
                ref={searchInputRef}
                aria-label="Search tasks"
                placeholder="Search tasks..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);

                  // Search only applies to the board and task list.
                  if (activeView !== "board" && activeView !== "tasks") {
                    navigateTo("tasks");
                  }
                }}
              />

              {search ? (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  title="Clear search"
                  onClick={() => setSearch("")}
                >
                  <Icon name="close" size={16} />
                </button>
              ) : (
                <kbd className="search-hint" aria-hidden="true">
                  /
                </kbd>
              )}
            </div>

            <button
              type="button"
              className="button button-secondary shortcut-help-button"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>

            <div className="display-wrap">
              <button
                ref={displayButtonRef}
                type="button"
                className="button button-secondary settings-button"
                aria-expanded={displayOpen}
                aria-controls="display-panel"
                aria-label="Display settings"
                onClick={() => setDisplayOpen((value) => !value)}
              >
                <Icon name="settings" size={17} />
                <span>Display</span>
              </button>

              {displayOpen && (
                <DisplayPanel
                  prefs={prefs}
                  setPrefs={setPrefs}
                  onClose={() => setDisplayOpen(false)}
                  btnRef={displayButtonRef}
                />
              )}
            </div>

            <button
              type="button"
              className="button button-secondary logout-button"
              onClick={onLogout}
              title={`Signed in as ${user.name}`}
            >
              Log out
            </button>

            <button
              type="button"
              className="button button-primary new-task-button"
              onClick={() => openNew()}
            >
              <Icon name="plus" size={18} />
              <span>New task</span>
            </button>
          </div>
        </header>

        <main id="main-content" className="app-content">
          {storageError && (
            <div className="storage-banner" role="alert">
              <Icon name="alert" size={18} />

              <span>
                Your latest changes could not be saved in this browser (storage
                may be full). Copy any important context somewhere safe before
                closing this page.
              </span>

              <button
                type="button"
                className="button button-secondary"
                onClick={() => setStorageError(false)}
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="page-heading">
            <div className="page-eyebrow">
              Workspace / {currentPage.label}
            </div>

            <h1 ref={headingRef} tabIndex={-1}>
              {pageTitle}
            </h1>

            <p>{pageSubtitle}</p>
          </div>

          {activeView === "overview" && renderOverview()}

          {activeView === "board" && (
            <>
              <DeliverablesBar
                anchors={anchors}
                setAnchors={setAnchors}
                onManage={() => navigateTo("deliverables")}
                notify={notify}
              />

              {renderBoard()}
            </>
          )}

          {activeView === "tasks" && (
            <>
              {renderTaskFilters()}

              <AllTasksView
                tasks={filteredTasks}
                members={assignableMembers}
                hasFilters={filtersActive}
                onEdit={openEdit}
                onMove={moveTask}
                onHandOff={handOffTask}
                onNew={() => openNew()}
              />
            </>
          )}

          {activeView === "calendar" && (
            <CalendarView tasks={tasks} onEdit={openEdit} />
          )}

          {activeView === "team" && (
            <TeamView
              tasks={tasks}
              members={teamMembers}
              project={project}
              onProject={setProject}
              onReset={resetSampleData}
              onLoadExampleTasks={loadExampleTasksOnly}
              onEdit={openEdit}
              onSaveMember={saveTeamMember}
              onRemoveMember={removeTeamMember}
            />
          )}

          {activeView === "deliverables" && (
            <Deliverables
              anchors={anchors}
              setAnchors={setAnchors}
              notify={notify}
            />
          )}
        </main>
      </div>

      {shortcutsOpen && (
        <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      )}

      {editing && (
        <TaskModal
          key={editing.id}
          task={editing}
          members={assignableMembers}
          isNew={isCreating}
          onSave={saveTask}
          onDelete={performDelete}
          onClose={closeModal}
          notify={notify}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          task={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => performDelete(deleteTarget)}
        />
      )}

      <div className="toast-container" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <Icon name="check" size={17} />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   STYLES — one consolidated stylesheet.
   Every font-size written in px is automatically scaled by the
   Text size setting, and never drops below 12px (see the
   replace() call at the very end of this file).
   ========================================================= */

const RAW_CSS = `

/* ---------- Theme variables ---------- */

.tracker {
  --text-scale: 1;
  --page: #f6f8fc;
  --surface: #ffffff;
  --surface-soft: #f3f6fa;
  --column: #eff3f9;
  --text: #1c2940;
  --muted: #55647c;
  --subtle: #5f6e86;
  --border: #e1e7f0;
  --border-strong: #c5d1e1;
  --primary: #3156c7;
  --primary-soft: #edf2ff;
  --danger: #c62839;
  --success: #15803d;
  --shadow: 0 2px 12px rgba(27, 45, 77, 0.05);

  display: flex;
  min-height: 100vh;
  background: var(--page);
  color: var(--text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.tracker.theme-dark {
  --page: #111827;
  --surface: #1a2536;
  --surface-soft: #243248;
  --column: #1a2639;
  --text: #edf2fa;
  --muted: #b8c5d9;
  --subtle: #9cadc6;
  --border: #35455f;
  --border-strong: #536887;
  --primary: #a6bbff;
  --primary-soft: #2b3e64;
  --danger: #fb7185;
  --success: #4ade80;
  --shadow: 0 3px 16px rgba(0, 0, 0, 0.14);
}

.tracker.theme-contrast {
  --page: #ffffff;
  --surface: #ffffff;
  --surface-soft: #f3f3f3;
  --column: #eeeeee;
  --text: #000000;
  --muted: #292929;
  --subtle: #444444;
  --border: #333333;
  --border-strong: #000000;
  --primary: #003cb3;
  --primary-soft: #e1eaff;
  --danger: #a30000;
  --success: #006300;
  --shadow: none;
}

.tracker *, .tracker *::before, .tracker *::after { box-sizing: border-box; }
.tracker button, .tracker input, .tracker select, .tracker textarea { font: inherit; }
.tracker button { cursor: pointer; }
.tracker button:disabled { opacity: 0.5; cursor: not-allowed; }
.tracker h1, .tracker h2, .tracker h3, .tracker h4, .tracker p { margin-top: 0; }
.tracker h1, .tracker h2, .tracker h3, .tracker h4 { color: var(--text); }
.tracker a { color: var(--primary); }
.tracker fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.tracker legend { padding: 0; }
.tracker :focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }
.tracker [tabindex="-1"]:focus { outline: none; }

.tracker .skip-link {
  position: fixed;
  top: -80px;
  left: 12px;
  z-index: 9999;
  padding: 10px 16px;
  background: var(--surface);
  color: var(--text);
  border: 2px solid var(--primary);
  border-radius: 8px;
}

.tracker .skip-link:focus { top: 12px; }

.tracker .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ---------- Buttons ---------- */

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.button-primary { color: #ffffff; background: #3156c7; border-color: #3156c7; }
.button-primary:hover:not(:disabled) { background: #2443a8; }
.button-secondary { background: var(--surface); color: var(--text); border-color: var(--border-strong); }
.button-secondary:hover:not(:disabled) { background: var(--surface-soft); }
.button-danger { background: #c62839; color: #ffffff; }
.button-danger:hover:not(:disabled) { background: #a81f2f; }
.button-text-danger { color: var(--danger); background: transparent; }
.button-text-danger:hover:not(:disabled) { background: var(--surface-soft); }

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: var(--muted);
  background: transparent;
}

.icon-button:hover { background: var(--surface-soft); color: var(--text); }
.icon-button.is-active { background: var(--primary-soft); color: var(--primary); }

/* ---------- Sidebar ---------- */

.app-sidebar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  flex: 0 0 244px;
  width: 244px;
  height: 100vh;
  background: var(--surface);
  border-right: 1px solid var(--border);
  transition: width 0.2s, flex-basis 0.2s;
}

.app-sidebar.sidebar-collapsed { flex-basis: 72px; width: 72px; }

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 75px;
  padding: 15px;
  border-bottom: 1px solid var(--border);
}

.sidebar-brand { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 15px; white-space: nowrap; }

.sidebar-brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 35px;
  height: 35px;
  border-radius: 10px;
  color: #ffffff;
  background: #3156c7;
}

.sidebar-nav { display: flex; flex-direction: column; gap: 5px; padding: 22px 11px; }
.sidebar-nav nav { display: flex; flex-direction: column; gap: 4px; }
.sidebar-section-label { margin: 0 12px 12px; color: var(--subtle); font-size: 12px; font-weight: 800; letter-spacing: 1.2px; }

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-weight: 600;
  text-align: left;
}

.sidebar-nav-item:hover { background: var(--surface-soft); color: var(--text); }
.sidebar-nav-item.active { color: var(--primary); background: var(--primary-soft); font-weight: 700; box-shadow: inset 3px 0 0 var(--primary); }
.sidebar-nav-icon { display: inline-flex; }
.sidebar-nav-label { flex: 1; }
.sidebar-count { padding: 1px 8px; border-radius: 20px; background: var(--surface-soft); color: var(--muted); font-size: 12px; }
.sidebar-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--border); }

.sidebar-collapse-button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.sidebar-collapse-button svg { flex-shrink: 0; }
.sidebar-collapse-button:hover { background: var(--surface-soft); color: var(--text); }

.sidebar-collapsed .sidebar-header { justify-content: center; flex-direction: column; gap: 10px; }
.sidebar-collapsed .sidebar-nav { align-items: center; }
.sidebar-collapsed .sidebar-nav-item { justify-content: center; width: 46px; padding: 10px; }
.sidebar-collapsed .sidebar-footer { padding: 12px 8px; }
.sidebar-collapsed .sidebar-collapse-button { justify-content: center; padding: 10px; }
.sidebar-mobile-close, .sidebar-mobile-backdrop { display: none; }

/* ---------- Header and page ---------- */

.app-workspace { flex: 1; min-width: 0; }

.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 74px;
  padding: 12px 30px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.header-left, .header-right { display: flex; align-items: center; gap: 12px; }
.header-right { margin-left: auto; }
.app-brand-name { margin: 0; color: var(--text); font-size: 15px; font-weight: 700; line-height: 1.25; }
.app-brand > span { color: var(--muted); font-size: 13px; }

.header-search {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 260px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-soft);
  color: var(--muted);
}

.header-search:focus-within { border-color: var(--primary); outline: 3px solid var(--primary); outline-offset: 2px; }
.header-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: var(--text); }
.header-search input::placeholder { color: var(--subtle); }
.search-clear { display: inline-flex; padding: 4px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); }
.search-hint { padding: 1px 7px; border: 1px solid var(--border-strong); border-radius: 5px; font-size: 12px; color: var(--subtle); }
.shortcut-help-button { min-width: 40px; padding: 8px 12px; }
.mobile-menu-button { display: none; }

.app-content { max-width: 1600px; margin: 0 auto; padding: 28px 30px 56px; }

.storage-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 13px 17px;
  border: 2px solid var(--danger);
  border-radius: 12px;
  background: var(--surface);
}

.storage-banner svg { flex-shrink: 0; color: var(--danger); }
.storage-banner span { flex: 1 1 260px; font-weight: 600; }

.page-heading { margin-bottom: 22px; }
.page-eyebrow { margin-bottom: 8px; color: var(--primary); font-size: 12px; font-weight: 800; letter-spacing: 1.1px; }
.page-heading h1 { margin-bottom: 4px; font-size: 28px; font-weight: 750; letter-spacing: -0.7px; line-height: 1.2; }
.page-heading p { margin: 0; color: var(--muted); }

.progress-track { overflow: hidden; height: 8px; border-radius: 30px; background: var(--border); }
.progress-track > div { height: 100%; border-radius: inherit; background: #3156c7; transition: width 0.25s; }

/* ---------- Shared panels ---------- */

.stat-card, .overview-panel, .team-card, .deliverable-card, .view-panel, .task-filter-bar, .deliverables-bar {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.board-heading, .section-heading, .view-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.board-heading h3, .section-heading h3, .view-toolbar h3 { margin: 0 0 3px; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
.board-heading p, .section-heading p, .view-toolbar p { margin: 0; color: var(--muted); font-size: 13px; }
.board-search-note { color: var(--muted); font-size: 13px; font-weight: 600; text-align: right; }

/* ---------- Deliverables bar (board) ---------- */

.deliverables-bar {
  container-type: inline-size;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 24px;
  padding: 12px 16px;
}

.deliverables-bar-heading { display: flex; align-items: center; gap: 8px; }
.deliverables-bar-heading svg { color: var(--primary); }
.deliverables-bar > .text-link-button { margin-left: auto; }

.deliverables-bar-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  flex: 1 1 0;
  min-width: 0;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.deliverable-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 40px;
  padding: 3px 4px 3px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
}

.deliverable-chip.editing { grid-column: 1 / -1; flex-wrap: wrap; padding: 8px 10px 8px 12px; }
.deliverable-chip-label { flex: 1 1 auto; min-width: 0; overflow: hidden; font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.deliverable-chip.editing .deliverable-chip-label { flex: 0 0 auto; }
.deliverable-chip-link { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 650; text-decoration: none; white-space: nowrap; }
.deliverable-chip-link:hover { text-decoration: underline; }
.deliverable-chip-empty { color: var(--muted); font-size: 13px; white-space: nowrap; }
.deliverable-chip .icon-button { width: 32px; height: 32px; flex: 0 0 auto; }
.deliverable-chip-edit { display: flex; flex: 1 1 320px; flex-wrap: wrap; align-items: center; gap: 8px; }

.deliverable-chip-edit input {
  flex: 1 1 220px;
  min-width: 0;
  min-height: 38px;
  padding: 6px 10px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
}

.deliverable-chip-edit input[aria-invalid="true"] { border-color: var(--danger); }
.deliverable-chip-edit .form-error { flex-basis: 100%; }

@container (max-width: 1080px) { .deliverables-bar-list { flex: 1 1 100%; order: 3; } }
@container (max-width: 800px) { .deliverables-bar-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (max-width: 520px) { .deliverables-bar-list { grid-template-columns: minmax(0, 1fr); } }

/* ---------- Filters (All Tasks) ---------- */

.task-filter-bar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; margin-bottom: 20px; padding: 14px 18px; }
.task-filter-heading { display: flex; align-items: center; gap: 8px; align-self: center; margin-right: 4px; }
.task-filter-heading svg { color: var(--primary); }
.task-filter-field { display: flex; flex-direction: column; gap: 5px; min-width: 130px; flex: 1 1 130px; }
.task-filter-field > span { color: var(--muted); font-size: 12px; font-weight: 650; }

.task-filter-field select {
  width: 100%;
  min-height: 40px;
  padding: 7px 10px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
}

.filter-results { align-self: center; margin-left: auto; color: var(--muted); font-size: 13px; white-space: nowrap; }

/* ---------- Badges ---------- */

.priority-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 26px;
  padding: 3px 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
  line-height: 1.25;
}

.priority-chip-icon { font-size: 14px; font-weight: 900; }
.priority-high { background: #fff0f0; color: #b01f2e; border-color: #ffd2d6; }
.priority-medium { background: #fff7e8; color: #8f5a00; border-color: #ffe1a6; }
.priority-low { background: #eaf7ef; color: #146b40; border-color: #c7e8d2; }
.theme-dark .priority-high { background: #502631; color: #ffb2bd; border-color: #77404b; }
.theme-dark .priority-medium { background: #49391e; color: #ffd58a; border-color: #6d5328; }
.theme-dark .priority-low { background: #1b4234; color: #9be6b8; border-color: #2b6249; }

.date-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  padding: 3px 8px;
  border-radius: 7px;
  color: var(--muted);
  background: var(--surface-soft);
  font-size: 12px;
  white-space: nowrap;
}

.date-overdue { color: #a91b1b; background: #feecec; }
.date-warning { color: #8f5a00; background: #fff4db; }
.date-complete { color: #146b3a; background: #e7f6ec; }
.theme-dark .date-overdue { color: #ff9ca8; background: #4a2830; }
.theme-dark .date-warning { color: #ffd68d; background: #493a22; }
.theme-dark .date-complete { color: #9be6b8; background: #214332; }

.task-type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.type-bug { color: #8f4a05; background: #fff1de; }
.theme-dark .type-bug { color: #ffcc8a; background: #493722; }

.team-task-status {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.status-done { color: #146b3a; background: #e7f6ec; }
.status-in-progress { color: #1a45c4; background: #e8efff; }
.status-review { color: #8f5a00; background: #fff4db; }
.theme-dark .status-done { color: #9be6b8; background: #214332; }
.theme-dark .status-in-progress { color: #a9c1ff; background: #243a6b; }
.theme-dark .status-review { color: #ffd68d; background: #493a22; }

/* ---------- Board ---------- */

.board-mobile-hint { display: none; margin: 0 0 8px; color: var(--muted); font-size: 13px; }

.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(250px, 1fr));
  gap: 14px;
  align-items: start;
  overflow-x: auto;
  padding-bottom: 12px;
}

.kanban-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 360px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--column);
}

.kanban-column.drag-over { outline: 2px dashed var(--primary); outline-offset: -4px; background: var(--primary-soft); }

.column-heading, .column-heading-left { display: flex; align-items: center; gap: 9px; }
.column-heading { justify-content: space-between; margin-bottom: 14px; padding: 3px 3px 12px; border-bottom: 1px solid var(--border); }
.column-heading h4 { margin: 0; font-size: 14px; font-weight: 750; }

.column-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--surface);
  color: var(--muted);
  font-weight: 800;
}

.indicator-todo { color: #5d6b82; }
.indicator-in-progress { color: #2358d6; }
.indicator-review { color: #8f5a00; }
.indicator-done { color: #15803d; }
.theme-dark .indicator-todo { color: #a4b3c8; }
.theme-dark .indicator-in-progress { color: #8ba7ff; }
.theme-dark .indicator-review { color: #fbbf24; }
.theme-dark .indicator-done { color: #4ade80; }

.column-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: 20px;
  background: var(--surface);
  color: var(--muted);
  font-size: 12px;
  font-weight: 650;
}

.column-tasks { display: flex; flex-direction: column; gap: 12px; flex: 1; margin: 0; padding: 0; list-style: none; }

.column-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 140px;
  padding: 15px;
  border: 1px dashed var(--border-strong);
  border-radius: 10px;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}

.column-empty strong { color: var(--text); }
.empty-icon { color: var(--subtle); }

.column-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 42px;
  margin-top: 12px;
  border: 1px dashed var(--border-strong);
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  font-weight: 650;
}

.column-add:hover { color: var(--primary); background: var(--surface); border-color: var(--primary); }

/* ---------- Task cards ----------
   Clean white card, no coloured edge. Status is carried by the
   badges, so nothing depends on colour alone. */

.task-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 1px 3px rgba(27, 45, 77, 0.06);
  cursor: grab;
  overflow-wrap: anywhere;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.task-card:active { cursor: grabbing; }
.task-card:hover { border-color: var(--border-strong); box-shadow: 0 6px 18px rgba(27, 45, 77, 0.09); }

.task-top, .task-top-actions, .task-footer, .task-quick-actions, .task-details { display: flex; align-items: center; gap: 8px; }
.task-top, .task-footer { justify-content: space-between; }
.task-top { margin-bottom: -2px; }
.task-id { color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
.task-top-actions { gap: 4px; }

.task-menu-wrap { position: relative; }
.task-more { width: 34px; height: 34px; margin-right: -6px; }

.task-menu {
  position: fixed;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 210px;
  padding: 7px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.18);
}

.task-menu button {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  text-align: left;
}

.task-menu button:hover { background: var(--surface-soft); }
.task-menu .menu-danger { color: var(--danger); }
.menu-divider { height: 1px; margin: 4px 0; background: var(--border); }
.menu-label { margin: 4px 4px 0; color: var(--muted); font-size: 12px; font-weight: 650; }

.task-menu select {
  width: 100%;
  min-height: 38px;
  padding: 7px;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
}

.task-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: 2px 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  text-align: left;
}

.task-title { color: var(--text); font-size: 15px; font-weight: 700; line-height: 1.4; letter-spacing: -0.15px; }
.task-main:hover .task-title { color: var(--primary); }

.task-description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.task-details { flex-wrap: wrap; }

.card-context {
  max-height: 230px;
  margin: 0;
  overflow: auto;
  padding: 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.task-footer { margin-top: 2px; padding-top: 12px; border-top: 1px solid var(--border); }
.task-assignee { display: flex; align-items: center; gap: 9px; min-width: 0; }

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.assignee-name { overflow: hidden; color: var(--text); font-size: 13px; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
.task-quick-actions { gap: 2px; margin-right: -6px; }
.task-quick-actions .icon-button { width: 36px; height: 36px; }

/* ---------- Overview ---------- */

.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
.stat-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; }
.stat-label { color: var(--muted); font-size: 13px; font-weight: 650; }
.stat-value { font-size: 32px; font-weight: 750; line-height: 1.1; letter-spacing: -1px; }
.stat-caption { color: var(--subtle); font-size: 12px; }
.stat-danger .stat-value { color: var(--danger); }

.overview-details-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; margin-bottom: 18px; }
.overview-panel { min-width: 0; padding: 22px; }
.overview-progress-large { display: flex; align-items: baseline; gap: 10px; margin: 16px 0 12px; }
.overview-progress-large strong { font-size: 32px; font-weight: 750; }
.overview-progress-large span { color: var(--muted); font-size: 13px; }

.stage-breakdown { display: flex; flex-direction: column; gap: 11px; margin-top: 22px; }
.stage-breakdown-row, .stage-breakdown-row > span { display: flex; align-items: center; gap: 10px; }
.stage-breakdown-row { justify-content: space-between; color: var(--muted); }
.stage-breakdown-row strong { color: var(--text); }

.text-link-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--primary);
  font-weight: 650;
}

.text-link-button:hover { text-decoration: underline; }

.recent-task-list, .team-task-list { display: flex; flex-direction: column; }

.recent-task-item, .team-task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  padding: 12px 0;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  text-align: left;
}

.recent-task-item:hover strong, .team-task-item:hover strong { color: var(--primary); }
.recent-task-item:last-child, .team-task-item:last-child { border-bottom: 0; }

.recent-task-main, .team-task-item > span:first-child { display: flex; flex-direction: column; min-width: 0; gap: 3px; }
.recent-task-main small, .team-task-item small { color: var(--muted); font-size: 12px; }
.recent-task-main strong, .team-task-item strong { color: var(--text); font-size: 14px; line-height: 1.4; overflow-wrap: anywhere; }

/* ---------- All tasks table ---------- */

.view-panel { overflow: hidden; }
.view-toolbar { flex-wrap: wrap; margin: 0; padding: 20px; border-bottom: 1px solid var(--border); }
.view-toolbar-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.toolbar-field { display: flex; flex-direction: column; gap: 5px; color: var(--muted); font-size: 12px; font-weight: 650; }

.toolbar-field select, .table-select {
  min-height: 38px;
  padding: 6px 9px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
}

.table-select { max-width: 160px; }
.tasks-table-wrap { overflow-x: auto; }
.tasks-table { width: 100%; border-collapse: collapse; text-align: left; }
.tasks-table th { padding: 13px 16px; background: var(--surface-soft); color: var(--muted); font-size: 12px; font-weight: 750; white-space: nowrap; }
.tasks-table td { padding: 14px 16px; border-top: 1px solid var(--border); vertical-align: middle; font-size: 13px; }
.tasks-table tbody tr:hover { background: var(--surface-soft); }

.table-task-link { display: flex; flex-direction: column; gap: 3px; min-width: 170px; padding: 0; border: 0; background: transparent; text-align: left; }
.table-task-id { color: var(--muted); font-size: 12px; font-weight: 750; }
.table-task-link strong { color: var(--text); font-size: 13px; }
.table-task-link:hover strong { color: var(--primary); text-decoration: underline; }

.view-empty-state { display: flex; flex-direction: column; align-items: center; gap: 11px; padding: 55px 20px; color: var(--muted); text-align: center; line-height: 1.6; }
.view-empty-state strong { color: var(--text); }
.view-empty-state p { margin: 0; }
.view-empty-message { margin: 0; color: var(--muted); font-size: 13px; }

/* ---------- Team ---------- */

.team-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 16px 22px; border-bottom: 1px solid var(--border); background: var(--surface-soft); }
.team-summary > div { display: flex; align-items: center; gap: 10px; min-width: 0; }
.team-summary strong { color: var(--text); font-size: 24px; }
.team-summary span { color: var(--muted); font-size: 13px; }

.team-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding: 20px; align-items: start; }
.team-card { display: flex; flex-direction: column; min-width: 0; padding: 20px; box-shadow: none; }
.team-member-top { display: flex; align-items: center; gap: 13px; min-width: 0; padding-bottom: 16px; }
.team-member-avatar { display: flex; align-items: center; justify-content: center; flex: 0 0 48px; height: 48px; border-radius: 12px; background: var(--primary-soft); color: var(--primary); font-size: 17px; font-weight: 800; }
.team-member-identity { min-width: 0; }
.team-member-identity h4 { margin: 0 0 3px; font-size: 17px; font-weight: 750; overflow-wrap: anywhere; }
.team-member-identity p { margin: 0 0 3px; color: var(--muted); font-size: 13px; }
.team-member-email { font-size: 13px; overflow-wrap: anywhere; text-decoration: none; }
.team-member-email:hover { text-decoration: underline; }

.team-member-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 14px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.team-member-stats > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.team-member-stats strong { color: var(--text); font-size: 21px; }
.team-member-stats span { color: var(--muted); font-size: 12px; }
.team-member-progress-label { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 8px; color: var(--muted); font-size: 13px; }
.team-member-progress-label strong { color: var(--text); }
.team-card > .progress-track { margin-bottom: 16px; }

.team-member-actions { display: flex; gap: 9px; padding-bottom: 14px; }
.team-member-actions .button { flex: 1; min-width: 0; min-height: 42px; font-size: 13px; }
.team-remove-button { background: transparent; border: 1px solid var(--danger); color: var(--danger); }
.team-remove-button:hover { background: var(--surface-soft); }

.team-member-tasks { padding-top: 8px; border-top: 1px solid var(--border); }
.team-member-tasks-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 40px; padding: 6px 0; border: 0; background: transparent; color: var(--primary); font-size: 13px; font-weight: 700; text-align: left; }
.team-member-tasks-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.team-member-no-tasks { margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.6; }

.member-editor { margin: 18px 20px; padding: 22px; border: 1px solid var(--border-strong); border-radius: 14px; background: var(--surface-soft); }
.member-editor h4 { margin: 0 0 16px; font-size: 18px; }
.member-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.member-fields label { display: flex; flex-direction: column; gap: 7px; font-size: 13px; font-weight: 650; }

.member-fields input, .member-fields select {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
}

.member-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 16px; }

/* ---------- Full team member profile ---------- */
.team-member-profile-link { padding: 0; border: 0; background: none; color: var(--text); font: inherit; font-weight: inherit; text-align: left; text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 4px; }
.team-member-profile-link:hover, .team-member-profile-link:focus-visible { color: var(--primary); text-decoration-color: currentColor; }
.team-profile-open-button { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; }
.member-profile-navigation { padding: 20px 24px 4px; }
.member-profile-header { display: flex; align-items: center; gap: 22px; padding: 22px 28px 26px; }
.member-profile-avatar { display: flex; align-items: center; justify-content: center; flex: 0 0 90px; width: 90px; height: 90px; border-radius: 20px; background: var(--primary-soft); color: var(--primary); font-size: 30px; font-weight: 800; }
.member-profile-heading-group { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; }
.member-profile-heading-group h3 { margin: 0; font-size: 27px; overflow-wrap: anywhere; }
.member-profile-heading-group .member-profile-role { margin: 0 0 5px; color: var(--muted); font-size: 16px; }
.member-profile-heading-group a { overflow-wrap: anywhere; font-size: 13px; text-decoration: none; }
.member-profile-heading-group a:hover { text-decoration: underline; }
.member-profile-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 0 28px 20px; }
.member-profile-summary > div { display: flex; flex-direction: column; gap: 5px; padding: 17px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-soft); }
.member-profile-summary strong { font-size: 27px; line-height: 1.2; }
.member-profile-summary span { color: var(--muted); font-size: 13px; }
.member-profile-completion { padding: 0 28px 24px; }
.member-profile-completion .team-member-progress-label { margin-top: 0; }
.member-profile-tasks-heading { padding: 22px 28px 14px; border-top: 1px solid var(--border); }
.member-profile-tasks-heading h4 { margin: 0 0 5px; font-size: 20px; }
.member-profile-tasks-heading p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
.member-profile-task-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding: 0 28px 28px; align-items: stretch; }
.member-profile-task { display: flex; flex-direction: column; min-width: 0; gap: 11px; padding: 19px; border: 1px solid var(--border); border-radius: 13px; background: var(--surface); }
.member-profile-task-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.member-profile-task h5 { margin: 0; font-size: 17px; line-height: 1.4; overflow-wrap: anywhere; }
.member-profile-task-description { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55; overflow-wrap: anywhere; }
.member-profile-task-badges { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.member-profile-context { border-top: 1px solid var(--border); padding-top: 10px; }
.member-profile-context summary { cursor: pointer; color: var(--primary); font-size: 13px; font-weight: 700; }
.member-profile-context pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow-y: auto; padding: 12px; border-radius: 8px; background: var(--surface-soft); font-size: 12px; line-height: 1.5; }
.member-profile-open-task { align-self: flex-start; margin-top: auto; display: inline-flex; align-items: center; gap: 8px; }
@media (max-width: 900px) { .member-profile-task-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) {
  .member-profile-navigation { padding: 15px 16px 0; }
  .member-profile-header { padding: 20px 16px; gap: 13px; align-items: flex-start; }
  .member-profile-avatar { flex-basis: 62px; width: 62px; height: 62px; border-radius: 14px; font-size: 22px; }
  .member-profile-heading-group h3 { font-size: 22px; }
  .member-profile-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0 16px 16px; }
  .member-profile-completion { padding: 0 16px 18px; }
  .member-profile-tasks-heading { padding: 18px 16px 12px; }
  .member-profile-task-grid { padding: 0 16px 20px; }
}

/* ---------- Calendar ---------- */

.calendar-navigation { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.calendar-navigation strong { min-width: 160px; text-align: center; }
.calendar-scroll { overflow-x: auto; padding: 12px 16px 4px; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(115px, 1fr)); gap: 5px; min-width: 805px; }
.calendar-weekday { padding: 10px 4px; color: var(--muted); font-size: 12px; font-weight: 750; letter-spacing: 0.06em; text-align: center; text-transform: uppercase; }
.calendar-cell { min-width: 0; min-height: 118px; padding: 8px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
.calendar-blank { opacity: 0.45; background: var(--page); }
.calendar-selected { outline: 2px solid var(--primary); outline-offset: -2px; }
.calendar-day { width: 34px; height: 34px; border: 0; border-radius: 50%; background: transparent; color: var(--text); font-weight: 700; }
.calendar-day:hover { background: var(--surface-soft); }
.calendar-today .calendar-day { background: var(--primary); color: var(--surface); }
.calendar-task { display: block; width: 100%; margin-top: 4px; padding: 5px 7px; border: 0; border-radius: 6px; background: var(--primary-soft); color: var(--primary); font-size: 12px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.calendar-task:hover { filter: brightness(0.95); }
.calendar-task-done { background: #d9f4e5; color: #14603a; text-decoration: line-through; }
.calendar-task-overdue { background: #ffe4df; color: #8b2418; }
.theme-dark .calendar-task-done { background: #214332; color: #9be6b8; }
.theme-dark .calendar-task-overdue { background: #4a2830; color: #ff9ca8; }
.calendar-more { min-height: 28px; padding: 2px 4px; border: 0; background: transparent; color: var(--text); font-size: 12px; text-decoration: underline; }

.calendar-day-details { margin: 20px; padding: 20px 22px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
.calendar-detail-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
.calendar-detail-eyebrow { display: block; margin-bottom: 6px; color: var(--muted); font-size: 12px; font-weight: 750; letter-spacing: 0.09em; }
.calendar-detail-header h3 { margin: 0; font-size: 19px; font-weight: 700; line-height: 1.4; }
.calendar-detail-count { padding: 6px 12px; border: 1px solid var(--border); border-radius: 99px; background: var(--page); color: var(--muted); font-size: 13px; font-weight: 700; white-space: nowrap; }
.calendar-empty-day { display: flex; gap: 14px; align-items: center; padding: 20px 2px 6px; }
.calendar-empty-icon { display: flex; align-items: center; justify-content: center; flex: 0 0 44px; height: 44px; border: 1px solid var(--border); border-radius: 12px; background: var(--page); color: var(--muted); }
.calendar-empty-day strong { display: block; margin-bottom: 4px; }
.calendar-empty-day p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
.calendar-selected-tasks { margin: 0; padding: 6px 0 0; list-style: none; }
.calendar-selected-tasks li { border-bottom: 1px solid var(--border); }
.calendar-selected-tasks li:last-child { border-bottom: 0; }
.calendar-detail-task { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 58px; padding: 12px 4px; border: 0; background: transparent; color: var(--text); text-align: left; }
.calendar-detail-task:hover { color: var(--primary); }
.calendar-detail-task-main { display: grid; gap: 4px; min-width: 0; }
.calendar-detail-task-main strong { font-size: 14px; }
.calendar-detail-task-main small { color: var(--muted); font-size: 13px; }
.calendar-note { display: flex; align-items: center; gap: 9px; margin: 0 20px 20px; padding: 10px 12px; border-radius: 9px; background: var(--page); color: var(--muted); font-size: 13px; line-height: 1.5; }
.calendar-note svg { flex-shrink: 0; }

/* ---------- Deliverables page ---------- */

.view-panel > .view-header { padding: 24px 26px 18px; border-bottom: 1px solid var(--border); }
.view-header .eyebrow { margin: 0 0 8px; color: var(--primary); font-size: 12px; font-weight: 750; letter-spacing: 0.1em; }
.view-header h3 { margin: 0 0 6px; font-size: 20px; font-weight: 700; }
.view-header p:not(.eyebrow) { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }

.deliverables-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; padding: 22px; align-items: stretch; }
.deliverable-card { display: flex; align-items: flex-start; gap: 16px; min-width: 0; min-height: 160px; padding: 22px; box-shadow: none; }
.deliverable-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 44px; height: 44px; border-radius: 11px; background: var(--primary-soft); color: var(--primary); }
.deliverable-content { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
.deliverable-content h4 { margin: 0; font-size: 16px; font-weight: 700; }
.deliverable-content .muted { margin: 0; color: var(--muted); font-size: 13px; }
.deliverable-link { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 650; text-decoration: none; overflow-wrap: anywhere; }
.deliverable-link:hover { text-decoration: underline; }
.deliverable-edit { display: flex; flex-direction: column; gap: 12px; width: 100%; }

.deliverable-edit input {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
}

.deliverable-edit input[aria-invalid="true"] { border-color: var(--danger); }
.deliverable-actions { display: flex; flex-wrap: wrap; gap: 9px; }

/* ---------- Modals ---------- */

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(10, 18, 35, 0.64);
}

.task-modal {
  display: flex;
  flex-direction: column;
  width: min(100%, 1000px);
  max-height: min(92vh, 950px);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.28);
}

.task-modal.confirm-modal { width: min(100%, 440px); }
.confirm-body { padding: 22px 25px; }
.confirm-body p { margin: 0; color: var(--muted); overflow-wrap: anywhere; }

.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; padding: 22px 25px; border-bottom: 1px solid var(--border); }
.modal-header h2 { margin: 0; font-size: 21px; }
.eyebrow { margin: 0 0 5px; color: var(--primary); font-size: 12px; font-weight: 800; letter-spacing: 1px; }

.task-modal form { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.modal-body { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; overflow-y: auto; padding: 24px 25px; }
.modal-column { display: flex; flex-direction: column; gap: 17px; min-width: 0; }
.form-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.form-field label { color: var(--text); font-size: 13px; font-weight: 700; }

.form-field input, .form-field textarea, .form-field select {
  width: 100%;
  min-height: 42px;
  padding: 9px 11px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
}

.form-field textarea { min-height: 90px; resize: vertical; line-height: 1.55; }
.form-field input:focus, .form-field textarea:focus, .form-field select:focus { border-color: var(--primary); }
.form-field input[aria-invalid="true"] { border-color: var(--danger); }
.form-error { color: var(--danger); font-size: 13px; font-weight: 600; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.field-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.segmented-control { display: inline-flex; padding: 3px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface-soft); }
.segmented-control button { min-height: 30px; padding: 4px 12px; border: 0; border-radius: 5px; background: transparent; color: var(--muted); font-size: 12px; }
.segmented-control button.selected { background: var(--surface); color: var(--primary); font-weight: 750; box-shadow: var(--shadow); }
.form-field .context-editor { min-height: 290px; font-family: Consolas, "Courier New", monospace; font-size: 13px; }

.context-preview { min-height: 290px; max-height: 400px; overflow: auto; padding: 12px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface-soft); }
.markdown-preview { color: var(--text); font-size: 13px; overflow-wrap: anywhere; }
.markdown-preview p { margin: 0 0 7px; white-space: pre-wrap; }
.markdown-preview ul { margin: 0 0 7px; padding-left: 20px; }
.markdown-heading { display: block; margin: 10px 0; font-size: 15px; }
.markdown-space { height: 8px; }
.markdown-indented { font-family: Consolas, "Courier New", monospace; }

.markdown-code {
  margin: 0 0 9px;
  padding: 10px 12px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text);
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre;
}

.field-hint { margin: 0; color: var(--muted); font-size: 13px; }

.discard-banner { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 25px; border-top: 1px solid var(--border); background: var(--surface-soft); }
.discard-banner span { margin-right: auto; color: var(--danger); font-size: 14px; font-weight: 650; }

.modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 16px 25px; border-top: 1px solid var(--border); }
.modal-footer-left, .modal-footer-right, .delete-confirm { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
.delete-confirm span { color: var(--danger); font-size: 13px; font-weight: 650; }

.shortcuts-dialog { width: min(440px, calc(100vw - 32px)); padding: 24px; border-radius: 16px; background: var(--surface); color: var(--text); box-shadow: 0 18px 65px rgba(0, 0, 0, 0.3); }
.shortcuts-dialog .modal-header { padding: 0 0 12px; }
.shortcuts-dialog dl { margin: 0; }
.shortcuts-dialog dl > div { display: flex; gap: 20px; align-items: center; padding: 13px 0; border-bottom: 1px solid var(--border); }
.shortcuts-dialog dl > div:last-child { border-bottom: 0; }
.shortcuts-dialog dt { width: 70px; }
.shortcuts-dialog dd { margin: 0; }
.shortcuts-dialog kbd { display: inline-block; min-width: 30px; padding: 4px 10px; border: 1px solid var(--border-strong); border-radius: 6px; font-weight: 700; text-align: center; }

/* ---------- Display settings ---------- */

.display-wrap { position: relative; }

.display-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 50;
  width: min(365px, calc(100vw - 24px));
  max-height: min(78vh, 690px);
  overflow-y: auto;
  padding: 0 20px 4px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 18px 50px rgba(20, 35, 65, 0.18);
}

.display-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 20px 0 17px;
  border-bottom: 1px solid var(--border);
}
.display-panel-heading h2 { margin: 0; font-size: 17px; font-weight: 750; letter-spacing: -.3px; }
.display-panel-heading p { margin: 4px 0 0; font-size: 12px; color: var(--muted); }
.display-panel-heading .icon-button { flex-shrink: 0; }

.display-panel .setting-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  margin: 0;
  padding: 17px 0;
  border: 0;
  border-bottom: 1px solid var(--border);
}
.display-panel .setting-group:last-child { border-bottom: 0; }
.display-panel .setting-label { padding: 0; color: var(--text); font-size: 13px; font-weight: 750; }
.display-panel .setting-description { margin: -4px 0 2px; color: var(--muted); font-size: 12px; line-height: 1.5; }

.display-panel .theme-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.display-panel .theme-options label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 51px;
  padding: 9px 5px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 11px;
  font-weight: 650;
  text-align: center;
  cursor: pointer;
}
.display-panel .theme-options label.selected { border-color: var(--primary); background: var(--primary-soft); }
.display-panel .theme-options input { width: 14px; height: 14px; flex-shrink: 0; accent-color: var(--primary); }

.display-panel .setting-toggle {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  min-height: 35px;
  padding: 5px 2px;
  color: var(--text);
  cursor: pointer;
}
.display-panel .setting-toggle input { width: 17px; height: 17px; margin: 2px 0 0; flex-shrink: 0; accent-color: var(--primary); }
.display-panel .setting-option-text { display: flex; flex-direction: column; gap: 2px; }
.display-panel .setting-option-text strong { font-size: 13px; font-weight: 650; }
.display-panel .setting-option-text small { color: var(--muted); font-size: 11px; line-height: 1.45; }
.display-panel .colour-option { min-height: 39px; }

.display-panel .text-size-controls { display: flex; align-items: center; justify-content: space-between; gap: 9px; }
.display-panel .text-size-controls button {
  width: 42px;
  height: 40px;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  background: var(--surface-soft);
  color: var(--text);
  cursor: pointer;
}
.display-panel .text-size-controls button:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.display-panel .text-size-controls button:disabled { opacity: .5; cursor: not-allowed; }
.display-panel .text-size-controls .text-size-reset { width: auto; min-width: 60px; padding: 0 10px; font-size: 12px; font-weight: 650; }
.display-panel .text-size-controls strong { min-width: 50px; font-size: 14px; text-align: center; }
.display-panel :is(input, button):focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }

/* ---------- Toast ---------- */

.toast-container { position: fixed; right: 23px; bottom: 23px; z-index: 200; pointer-events: none; }

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 340px;
  padding: 13px 17px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.18);
  font-weight: 650;
}

.toast svg { color: var(--success); flex-shrink: 0; }

/* ---------- Accessibility modes ---------- */

.tracker.easy-reading { line-height: 1.75; letter-spacing: 0.15px; }
.tracker.easy-reading .task-card, .tracker.easy-reading .stat-card, .tracker.easy-reading .overview-panel { padding: 22px; }

.tracker.reduced-motion *, .tracker.reduced-motion *::before, .tracker.reduced-motion *::after {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

@media (prefers-reduced-motion: reduce) {
  .tracker *, .tracker *::before, .tracker *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

.theme-contrast .task-card, .theme-contrast .kanban-column, .theme-contrast .overview-panel,
.theme-contrast .stat-card, .theme-contrast .team-card, .theme-contrast .deliverable-card,
.theme-contrast .view-panel, .theme-contrast .calendar-cell { border-width: 2px; }

/* ---------- Responsive ---------- */

@media (max-width: 1250px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kanban-board { grid-template-columns: repeat(4, minmax(270px, 1fr)); }
}

@media (max-width: 1100px) {
  .team-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 950px) {
  .app-header { padding: 12px 18px; }
  .app-content { padding: 22px 16px 48px; }
  .header-search { width: 190px; }
  .overview-details-grid { grid-template-columns: 1fr; }
  .deliverables-grid { grid-template-columns: 1fr; }
  .modal-body { grid-template-columns: 1fr; }
  .board-mobile-hint { display: block; }
}

@media (max-width: 700px) {
  .app-sidebar, .app-sidebar.sidebar-collapsed {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 90;
    width: 260px;
    height: 100dvh;
    flex-basis: 260px;
    transform: translateX(-105%);
    transition: transform 0.2s;
  }

  .app-sidebar.sidebar-mobile-open { transform: translateX(0); }

  .sidebar-mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  .sidebar-mobile-close, .mobile-menu-button { display: inline-flex; }
  .sidebar-collapse-button { display: none; }
  .sidebar-collapsed .sidebar-header { flex-direction: row; justify-content: space-between; }
  .sidebar-collapsed .sidebar-nav { align-items: stretch; }
  .sidebar-collapsed .sidebar-nav-item { justify-content: flex-start; width: 100%; }
  .app-header { flex-wrap: wrap; gap: 11px; }
  .header-right { flex: 1 1 100%; justify-content: space-between; }
  .header-search { flex: 1; width: auto; }
  .settings-button span, .shortcut-help-button { display: none; }
  .app-content { padding: 18px 12px 44px; }
  .page-heading h1 { font-size: 24px; }
  .board-heading { align-items: flex-start; flex-direction: column; }
  .board-search-note { text-align: left; }
  .team-summary { grid-template-columns: 1fr; gap: 8px; }
  .team-grid, .deliverables-grid { grid-template-columns: 1fr; gap: 14px; padding: 14px; }
  .team-card, .deliverable-card { padding: 18px; }
  .view-panel > .view-header { padding: 20px 18px; }
  .task-filter-bar { align-items: stretch; padding: 14px; }
  .task-filter-heading { width: 100%; }
  .task-filter-field { flex: 1 1 calc(50% - 12px); }
  .filter-results { width: 100%; margin-left: 0; }
  .calendar-navigation { margin-top: 12px; }
  .calendar-day-details { margin: 14px; padding: 16px; }
  .calendar-detail-header h3 { font-size: 17px; }
  .calendar-note { margin: 0 14px 16px; }
  .modal-backdrop { padding: 9px; }
  .task-modal { max-height: 97dvh; }
  .modal-header, .modal-body, .modal-footer, .discard-banner { padding: 15px; }
  .modal-footer { flex-direction: column; align-items: stretch; }
  .modal-footer-left, .modal-footer-right { justify-content: flex-end; }
}

@media (max-width: 430px) {
  .app-content { padding: 16px 12px 40px; }
  .page-heading h1 { font-size: 22px; }
  .summary-grid { gap: 10px; }
  .stat-card { padding: 14px; }
  .stat-value { font-size: 27px; }
  .task-filter-field { flex-basis: 100%; }
  .form-grid { grid-template-columns: 1fr; }
  .display-panel { right: -65px; width: min(365px, calc(100vw - 24px)); }
  .new-task-button { padding: 8px 12px; }
  .new-task-button span { display: none; }
  .team-member-actions { flex-wrap: wrap; }
}

/* ---------- Requested colour coding: bug red, feature green ---------- */
.tracker .type-bug { color: #a91b1b; background: #feecec; border: 1px solid #f3b4b4; }
.tracker .type-feature { color: #146b3a; background: #e7f6ec; border: 1px solid #b9e0c8; }
.tracker.theme-dark .type-bug { color: #ffb2bd; background: #502631; border-color: #77404b; }
.tracker.theme-dark .type-feature { color: #9be6b8; background: #1b4234; border-color: #2b6249; }

/* Four time bands: label, icon and border make colour non-essential. */
.tracker .date-overdue { border: 2px solid #c62839; font-weight: 750; }
.tracker .date-urgent { color: #8f3a00; background: #ffe9d6; border: 2px dashed #d9730d; font-weight: 700; }
.tracker .date-soon { color: #7a5a00; background: #fff4db; border: 1px dashed #c99a1a; }
.tracker.theme-dark .date-urgent { color: #ffc9a0; background: #4d3220; border-color: #e08a3c; }
.tracker.theme-dark .date-soon { color: #ffd68d; background: #493a22; border-color: #c99a1a; }

/* Colour-blind-friendly palette: blue, orange and vermillion. */
.tracker.palette-cb .type-bug { color: #7a2e00; background: #fde3d2; border-color: #d55e00; }
.tracker.palette-cb .type-feature { color: #004a75; background: #dcecf8; border-color: #0072b2; }
.tracker.palette-cb .date-overdue { color: #7a2e00; background: #fde3d2; border: 2px solid #d55e00; }
.tracker.palette-cb .date-urgent { color: #6b4a00; background: #fff0c9; border: 2px dashed #e69f00; }
.tracker.palette-cb .date-soon { color: #004a75; background: #e8f1fa; border: 1px dashed #0072b2; }
.tracker.palette-cb .date-complete { color: #004a75; background: #dcecf8; }
.tracker.palette-cb.theme-dark .type-bug,
.tracker.palette-cb.theme-dark .date-overdue { color: #ffc9a8; background: #4a2a14; border-color: #d55e00; }
.tracker.palette-cb.theme-dark .type-feature,
.tracker.palette-cb.theme-dark .date-soon,
.tracker.palette-cb.theme-dark .date-complete { color: #bfe0f5; background: #16384f; border-color: #56a9d9; }
.tracker.palette-cb.theme-dark .date-urgent { color: #ffe3a0; background: #4a3a10; border-color: #e69f00; }

/* ---------- Clean workspace controls and unobtrusive legend ---------- */
.tracker .page-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .3px;
  text-transform: none;
  color: var(--subtle);
}
.tracker .view-toolbar { padding: 22px 26px; gap: 20px; }
.tracker .view-toolbar h3 { font-size: 18px; letter-spacing: -.35px; }
.tracker .view-toolbar p { max-width: 640px; margin-top: 4px; line-height: 1.55; }
.tracker .view-toolbar-actions .button-primary { white-space: nowrap; }

.tracker .project-bar {
  display: grid;
  grid-template-columns: minmax(180px, .85fr) minmax(180px, 1fr) minmax(230px, 1.4fr);
  align-items: end;
  gap: 16px 22px;
  padding: 22px 26px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
}
.tracker .project-bar-intro { display: flex; flex-direction: column; gap: 3px; align-self: center; }
.tracker .project-kicker { font-size: 10px; font-weight: 800; letter-spacing: 1.1px; color: var(--primary); }
.tracker .project-bar-intro strong { font-size: 17px; font-weight: 750; letter-spacing: -.25px; }
.tracker .project-bar-intro > span:last-child { font-size: 12px; color: var(--muted); }
.tracker .project-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.tracker .project-field > span { font-size: 12px; font-weight: 700; color: var(--muted); }
.tracker .project-field input {
  width: 100%; min-height: 42px; padding: 9px 12px;
  border: 1px solid var(--border-strong); border-radius: 9px;
  background: var(--surface); color: var(--text);
  transition: border-color .15s, box-shadow .15s;
}
.tracker .project-field input:focus-visible { outline-offset: 1px; }
.tracker .sample-tools { grid-column: 1 / -1; font-size: 12px; color: var(--muted); }
.tracker .sample-tools summary { width: max-content; cursor: pointer; color: var(--muted); }
.tracker .sample-tools[open] { padding: 10px 0 0; border-top: 1px solid var(--border); }
.tracker .sample-tools p { margin: 10px 0; font-size: 12px; max-width: 680px; }
.tracker .sample-tools .button { font-size: 12px; min-height: 34px; }

.tracker .board-heading-actions { display: flex; align-items: center; gap: 12px; }
.tracker .board-legend { position: relative; z-index: 15; }
.tracker .board-legend > summary {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 36px; padding: 7px 13px; border: 1px solid var(--border-strong);
  border-radius: 9px; background: var(--surface); color: var(--muted);
  font-size: 12px; font-weight: 700; cursor: pointer;
  list-style: none;
}
.tracker .board-legend > summary::-webkit-details-marker { display: none; }
.tracker .board-legend > summary::before {
  content: ''; display: inline-block; width: 9px; height: 9px;
  margin-right: 8px; border-radius: 50%; background: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}
.tracker .board-legend > summary:hover { background: var(--surface-soft); }
.tracker .board-legend-popover {
  position: absolute; right: 0; top: calc(100% + 8px); width: min(360px, 85vw);
  display: grid; gap: 9px; padding: 18px;
  border: 1px solid var(--border); border-radius: 13px;
  background: var(--surface); box-shadow: 0 14px 36px rgba(18,34,60,.16);
}
.tracker .board-legend-popover strong { margin: 4px 0 0; font-size: 12px; color: var(--text); }
.tracker .board-legend-popover > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.tracker .board-legend-popover > div > span:last-child { color: var(--muted); font-size: 11px; text-align: right; }
.tracker .board-legend-popover .date-chip { flex-shrink: 0; }

@media (max-width: 900px) {
  .tracker .project-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tracker .project-bar-intro { grid-column: 1 / -1; }
}
@media (max-width: 600px) {
  .tracker .project-bar { grid-template-columns: minmax(0, 1fr); padding: 18px; }
  .tracker .project-bar-intro { grid-column: auto; }
  .tracker .view-toolbar { padding: 18px; }
  .tracker .board-heading-actions { width: 100%; justify-content: flex-end; }
}
.team-member-email { display: block; }


/* ---------- Mobile header: prevent horizontal page overflow ---------- */
@media (max-width: 700px) {
  .tracker, .tracker .app-workspace, .tracker .app-content {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .tracker .app-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
    width: 100%;
    min-width: 0;
  }

  .tracker .header-left {
    width: 100%;
    min-width: 0;
  }

  .tracker .app-brand { min-width: 0; }
  .tracker .app-brand > span { overflow-wrap: anywhere; }

  .tracker .header-right {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    width: 100%;
    min-width: 0;
    margin-left: 0;
    gap: 8px;
    justify-content: flex-start;
  }

  .tracker .header-search {
    flex: 1 1 100%;
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .tracker .display-wrap { flex: 0 0 auto; }
  .tracker .logout-button,
  .tracker .new-task-button {
    flex: 1 1 auto;
    min-width: 0;
    justify-content: center;
  }

  .tracker .summary-grid,
  .tracker .overview-details-grid {
    max-width: 100%;
    min-width: 0;
  }
}

@media (max-width: 430px) {
  .tracker .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tracker .new-task-button span { display: inline; }
}


/* Mobile display settings: use a viewport-centred, scrollable dialog.
   This overrides the desktop dropdown and the old right:-65px rule. */
@media (max-width: 700px) {
  .tracker .display-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    width: calc(100vw - 24px);
    max-width: 420px;
    max-height: calc(100dvh - 32px);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 0 16px 12px;
    z-index: 200;
  }
  .tracker .display-panel .theme-options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .tracker .display-panel .text-size-controls {
    flex-wrap: wrap;
  }
}

`;

// Scale every px font-size with the "Text size" setting.
// max() keeps the final, scaled size from ever dropping below 12px.
const CSS = RAW_CSS.replace(
  /font-size:\s*([\d.]+)px/g,
  (_, size) =>
    `font-size: max(12px, calc(${Math.max(Number(size), 12)}px * var(--text-scale, 1)))`
);


/* =========================================================
   LOGIN / REGISTER (front-end only, stored in this browser)
   Everyone who logs in shares the same project board.
   ========================================================= */

const USERS_KEY = "pt.auth.users.v1";
const SESSION_KEY = "pt.auth.session.v1";

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Demo logins for the seven team members (placeholder password for demonstration only).
const DEMO_PASSWORD = "Password123";

const DEMO_ACCOUNTS = [
  { name: "Aiysha", email: "aiysha@example.com" },
  { name: "Amirah", email: "amirah@example.com" },
  { name: "Zara Khan", email: "zara.khan@example.com" },
  { name: "Daniel Reed", email: "daniel.reed@example.com" },
  { name: "Sofia Patel", email: "sofia.patel@example.com" },
  { name: "Noah Carter", email: "noah.carter@example.com" },
  { name: "Leila Ahmed", email: "leila.ahmed@example.com" },
];

// Adds any missing demo accounts. Existing accounts are never changed.
async function seedDemoAccounts() {
  const users = readJSON(USERS_KEY, []);
  const missing = DEMO_ACCOUNTS.filter(
    (demo) => !users.some((user) => user.email === demo.email)
  );

  if (!missing.length) return;

  const created = [];

  for (const demo of missing) {
    const salt = randomSalt();
    created.push({ ...demo, salt, hash: await hashPassword(DEMO_PASSWORD, salt) });
  }

  localStorage.setItem(USERS_KEY, JSON.stringify([...users, ...created]));
}

// Password reset (simulated: there is no server to send email, so the code is shown on screen).
const RESET_KEY = "pt.auth.reset.v1";
const RESET_MINUTES = 10;
const RESET_MAX_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUTH_TEXT = {
  login: ["Welcome back", "Log in to continue to your project board."],
  register: ["Create your account", "Register to start managing your team's work."],
  forgot: ["Reset your password", "Enter your account email and we'll send you a reset code."],
  reset: ["Enter your reset code", "Check your code, then choose a new password."],
};

function LoginScreen({ onAuth, onGuest }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    code: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);

  const savedTheme = readJSON("pt.prefs.v5", {}).theme;
  const theme = THEMES.includes(savedTheme) ? savedTheme : "light";
  const isRegister = mode === "register";
  const [heading, subtitle] = AUTH_TEXT[mode];

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError("");
  };

  function goTo(next) {
    setMode(next);
    setError("");
    setNotice("");
    setDemoCode("");
    setForm((current) => ({
      name: "",
      email: next === "forgot" || next === "login" ? current.email : "",
      password: "",
      confirm: "",
      code: "",
    }));
  }

  async function requestReset(email) {
    if (!EMAIL_PATTERN.test(email)) {
      return setError("Please enter a valid email address.");
    }

    setBusy(true);

    try {
      await seedDemoAccounts();

      const exists = readJSON(USERS_KEY, []).some((u) => u.email === email);
      let code = "";

      if (exists) {
        code = String(
          crypto.getRandomValues(new Uint32Array(1))[0] % 1000000
        ).padStart(6, "0");

        sessionStorage.setItem(
          RESET_KEY,
          JSON.stringify({
            email,
            code,
            expires: Date.now() + RESET_MINUTES * 60000,
            attempts: 0,
          })
        );
      } else {
        sessionStorage.removeItem(RESET_KEY);
      }

      setDemoCode(code);
      setForm((current) => ({ ...current, code: "", password: "", confirm: "" }));
      setNotice(`If an account exists for ${email}, a reset code has been sent.`);
      setError("");
      setMode("reset");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function completeReset(email) {
    if (!form.code.trim()) return setError("Please enter the 6-digit code.");
    if (form.password.length < 8) {
      return setError("New password must be at least 8 characters.");
    }
    if (form.password !== form.confirm) {
      return setError("Passwords do not match.");
    }

    setBusy(true);

    try {
      const request = JSON.parse(sessionStorage.getItem(RESET_KEY) || "null");

      const valid =
        request &&
        request.email === email &&
        Date.now() < request.expires &&
        request.attempts < RESET_MAX_ATTEMPTS;

      if (!valid) {
        setError("This code is invalid or has expired. Please request a new one.");
        return;
      }

      if (form.code.trim() !== request.code) {
        sessionStorage.setItem(
          RESET_KEY,
          JSON.stringify({ ...request, attempts: request.attempts + 1 })
        );
        setError("Incorrect code. Please try again.");
        return;
      }

      const salt = randomSalt();
      const hash = await hashPassword(form.password, salt);
      const users = readJSON(USERS_KEY, []);

      localStorage.setItem(
        USERS_KEY,
        JSON.stringify(
          users.map((u) => (u.email === email ? { ...u, salt, hash } : u))
        )
      );

      sessionStorage.removeItem(RESET_KEY);
      setDemoCode("");
      setForm((current) => ({ ...current, password: "", confirm: "", code: "" }));
      setError("");
      setNotice("Password updated. Log in with your new password.");
      setMode("login");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();

    if (mode === "forgot") return requestReset(email);
    if (mode === "reset") return completeReset(email);

    setNotice("");

    if (isRegister && !name) return setError("Please enter your name.");
    if (!EMAIL_PATTERN.test(email)) {
      return setError("Please enter a valid email address.");
    }
    if (!form.password) return setError("Please enter your password.");

    if (isRegister) {
      if (form.password.length < 8) {
        return setError("Password must be at least 8 characters.");
      }
      if (form.password !== form.confirm) {
        return setError("Passwords do not match.");
      }
    }

    setBusy(true);

    try {
      await seedDemoAccounts();

      const users = readJSON(USERS_KEY, []);
      const existing = users.find((u) => u.email === email);

      if (isRegister) {
        if (existing) {
          setError("An account with this email already exists. Log in instead.");
          return;
        }

        const salt = randomSalt();
        const hash = await hashPassword(form.password, salt);

        localStorage.setItem(
          USERS_KEY,
          JSON.stringify([...users, { name, email, salt, hash }])
        );

        onAuth({ name, email });
      } else {
        const hash = existing
          ? await hashPassword(form.password, existing.salt)
          : null;

        // One generic message so it doesn't reveal which emails exist.
        if (!existing || hash !== existing.hash) {
          setError("Incorrect email or password.");
          return;
        }

        onAuth({ name: existing.name, email: existing.email });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const submitLabel = {
    login: "Log in",
    register: "Create account",
    forgot: "Send reset code",
    reset: "Update password",
  }[mode];

  return (
    <div className={`tracker login-page theme-${theme}`}>
      <style>{CSS}</style>
      <style>{LOGIN_CSS}</style>

      <main className="login-card" aria-labelledby="login-heading">
        <div className="login-brand">
          <div className="sidebar-brand-icon">
            <Icon name="board" size={21} />
          </div>
          <strong>{APP_NAME}</strong>
        </div>

        <h1 id="login-heading">{heading}</h1>
        <p className="login-subtitle">{subtitle}</p>

        {notice && (
          <p className="login-notice" role="status">
            {notice}
          </p>
        )}

        {mode === "reset" && demoCode && (
          <p className="login-demo" role="status">
            <strong>Demo only:</strong> this prototype has no email server, so
            your reset code is shown here: <strong>{demoCode}</strong>. It
            expires in {RESET_MINUTES} minutes.
          </p>
        )}

        <form key={mode} onSubmit={submit} noValidate>
          {isRegister && (
            <div className="form-field">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                autoComplete="name"
                autoFocus
                value={form.name}
                onChange={set("name")}
              />
            </div>
          )}

          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <div className="form-field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                autoFocus={!isRegister}
                value={form.email}
                onChange={set("email")}
                aria-invalid={Boolean(error)}
              />
            </div>
          )}

          {mode === "reset" && (
            <>
              <p className="login-reset-email">
                Resetting the password for <strong>{form.email.trim().toLowerCase()}</strong>
              </p>

              <div className="form-field">
                <label htmlFor="auth-code">6-digit reset code</label>
                <input
                  id="auth-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={form.code}
                  onChange={set("code")}
                  aria-invalid={Boolean(error)}
                />
              </div>
            </>
          )}

          {mode !== "forgot" && (
            <div className="form-field">
              <label htmlFor="auth-password">
                {mode === "reset" ? "New password" : "Password"}
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
                aria-invalid={Boolean(error)}
              />
              {mode !== "login" && (
                <span className="field-hint">At least 8 characters.</span>
              )}
            </div>
          )}

          {(isRegister || mode === "reset") && (
            <div className="form-field">
              <label htmlFor="auth-confirm">
                {mode === "reset" ? "Confirm new password" : "Confirm password"}
              </label>
              <input
                id="auth-confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set("confirm")}
              />
            </div>
          )}

          {mode === "login" && (
            <button
              type="button"
              className="text-link-button login-forgot"
              onClick={() => goTo("forgot")}
            >
              Forgot password?
            </button>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="button button-primary login-submit"
            disabled={busy}
          >
            {busy ? "Please wait..." : submitLabel}
          </button>
        </form>

        {mode === "login" && (
          <div className="guest-entry">
            <p className="guest-divider">or explore without an account</p>
            <button type="button" className="button button-secondary guest-button" onClick={onGuest}>
              Continue as Guest
            </button>
            <p className="guest-hint">Try the Kanban board with sample tasks. Guest changes stay separate in this browser.</p>
          </div>
        )}

        <p className="login-switch">
          {mode === "login" && (
            <>
              New here?{" "}
              <button type="button" className="text-link-button" onClick={() => goTo("register")}>
                Create an account
              </button>
            </>
          )}

          {mode === "register" && (
            <>
              Already have an account?{" "}
              <button type="button" className="text-link-button" onClick={() => goTo("login")}>
                Log in
              </button>
            </>
          )}

          {mode === "forgot" && (
            <button type="button" className="text-link-button" onClick={() => goTo("login")}>
              Back to log in
            </button>
          )}

          {mode === "reset" && (
            <>
              <button type="button" className="text-link-button" onClick={() => goTo("forgot")}>
                Send a new code
              </button>
              {" · "}
              <button type="button" className="text-link-button" onClick={() => goTo("login")}>
                Back to log in
              </button>
            </>
          )}
        </p>
      </main>
    </div>
  );
}

const LOGIN_CSS = `
.tracker.login-page { align-items: center; justify-content: center; padding: 24px; }
.tracker .login-card {
  width: min(100%, 420px);
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.tracker .login-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; font-size: 15px; }
.tracker .login-card h1 { margin-bottom: 6px; font-size: 24px; letter-spacing: -0.5px; }
.tracker .login-subtitle { margin-bottom: 22px; color: var(--muted); }
.tracker .login-card form { display: flex; flex-direction: column; gap: 16px; }
.tracker .login-submit { width: 100%; min-height: 44px; margin-top: 4px; }
.tracker .guest-entry { margin-top: 16px; text-align: center; }
.tracker .guest-divider { margin: 0 0 12px; color: var(--muted); font-size: 13px; }
.tracker .guest-button { width: 100%; justify-content: center; min-height: 46px; }
.tracker .guest-hint { margin: 10px 0 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
.tracker .login-switch { margin: 20px 0 0; color: var(--muted); text-align: center; }
.tracker .login-switch .text-link-button { display: inline-flex; min-height: 32px; }
.tracker .login-forgot { align-self: flex-start; margin: -6px 0 0 -6px; }
.tracker .login-notice { margin: 0 0 16px; padding: 10px 12px; border: 1px solid var(--border-strong); border-radius: 9px; background: var(--primary-soft); color: var(--text); font-size: 13px; }
.tracker .login-demo { margin: 0 0 16px; padding: 10px 12px; border: 2px dashed var(--primary); border-radius: 9px; background: var(--surface-soft); color: var(--text); font-size: 13px; line-height: 1.55; }
.tracker .login-reset-email { margin: 0; color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
`;

/* =========================================================
   ROOT: shows the login screen until someone is signed in
   ========================================================= */

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = readJSON(SESSION_KEY, null);
    return saved && typeof saved.email === "string" ? saved : null;
  });

  const signIn = (account) => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(account));
    } catch {
      // The session still works until the page is closed.
    }
    setUser(account);
  };

  const signOut = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors.
    }
    setUser(null);
  };

  if (!user) {
    return <LoginScreen onAuth={signIn} onGuest={() => setUser({ name: "Guest", guest: true })} />;
  }

  return <TrackerApp key={user.guest ? "guest" : "account"} user={user} onLogout={signOut} />;
}
