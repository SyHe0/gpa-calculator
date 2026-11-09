"use strict";

// ---------- Bileşen türleri ----------
const COMPONENT_TYPES = {
  midterm:  { label: "Vize (Midterm)",     itemLabel: "Vize",     multi: true,  defaultCount: 1 },
  quiz:     { label: "Quiz",               itemLabel: "Quiz",     multi: true,  defaultCount: 2 },
  homework: { label: "Ödev / Proje",       itemLabel: "Ödev",     multi: true,  defaultCount: 1 },
  activity: { label: "Ders Dışı Etkinlik", itemLabel: "Etkinlik", multi: true,  defaultCount: 1 },
  final:    { label: "Final",              itemLabel: "Final",    multi: false, defaultCount: 1 },
};

// ---------- Durum ----------
let state = { courses: [] };

const uid = () => Math.random().toString(36).slice(2, 10);

function makeComponent(type) {
  const def = COMPONENT_TYPES[type];
  return {
    id: uid(),
    type,
    items: Array.from({ length: def.defaultCount }, () => ({ score: "" })),
  };
}

function makeCourse(name) {
  return {
    id: uid(),
    name: name || `Ders ${state.courses.length + 1}`,
    credits: 3,
    components: [makeComponent("midterm"), makeComponent("quiz"), makeComponent("final")],
  };
}

const findCourse = (id) => state.courses.find((c) => c.id === id);
const findComponent = (course, id) => course.components.find((c) => c.id === id);

// ---------- DOM yardımcıları ----------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// ---------- Render ----------
function renderComponent(course, comp) {
  const def = COMPONENT_TYPES[comp.type];

  const countControl = def.multi
    ? el("label", { class: "count" }, "Adet",
        el("input", {
          type: "number", min: 1, max: 20, value: comp.items.length,
          dataset: { action: "count", course: course.id, comp: comp.id },
        }))
    : null;

  const items = comp.items.map((item, i) =>
    el("label", { class: "item" },
      el("span", {}, def.multi ? `${def.itemLabel} ${i + 1}` : def.itemLabel),
      el("input", {
        type: "number", min: 0, max: 100, step: "any", placeholder: "0-100", value: item.score,
        dataset: { action: "score", course: course.id, comp: comp.id, index: i },
      })));

  return el("div", { class: "component", dataset: { type: comp.type } },
    el("div", { class: "component-head" },
      el("strong", {}, def.label),
      countControl,
      el("button", {
        class: "icon-btn", title: "Bileşeni kaldır",
        dataset: { action: "remove-comp", course: course.id, comp: comp.id },
      }, "×")),
    el("div", { class: "items" }, items));
}

function renderCourse(course) {
  const addOptions = Object.entries(COMPONENT_TYPES)
    .filter(([type, def]) => def.multi || !course.components.some((c) => c.type === type))
    .map(([type, def]) => el("option", { value: type }, def.label));

  return el("article", { class: "course card", dataset: { id: course.id } },
    el("div", { class: "course-head" },
      el("input", {
        class: "course-name", value: course.name, placeholder: "Ders adı",
        dataset: { action: "name", course: course.id },
      }),
      el("label", { class: "credits" }, "Kredi",
        el("input", {
          type: "number", min: 0, max: 30, step: "0.5", value: course.credits,
          dataset: { action: "credits", course: course.id },
        })),
      el("button", {
        class: "btn danger", dataset: { action: "remove-course", course: course.id },
      }, "Dersi sil")),
    el("div", { class: "components" }, course.components.map((c) => renderComponent(course, c))),
    el("div", { class: "add-comp" },
      el("select", { dataset: { role: "comp-type", course: course.id } }, addOptions),
      el("button", { class: "btn", dataset: { action: "add-comp", course: course.id } }, "+ Bileşen ekle")));
}

function render() {
  const root = document.getElementById("courses");
  root.replaceChildren();
  if (state.courses.length === 0) {
    root.append(el("p", { class: "empty" }, "Henüz ders yok. Başlamak için “+ Ders ekle” butonuna bas."));
  }
  state.courses.forEach((c) => root.append(renderCourse(c)));
}

// ---------- Olaylar ----------
function onInput(e) {
  const t = e.target;
  const { action } = t.dataset;
  if (!action) return;
  const course = findCourse(t.dataset.course);
  if (!course) return;

  switch (action) {
    case "name":
      course.name = t.value;
      break;
    case "credits":
      course.credits = t.value;
      break;
    case "score": {
      const comp = findComponent(course, t.dataset.comp);
      comp.items[Number(t.dataset.index)].score = t.value;
      break;
    }
    case "count": {
      if (e.type !== "change") return;
      const comp = findComponent(course, t.dataset.comp);
      const n = Math.max(1, Math.min(20, parseInt(t.value, 10) || 1));
      while (comp.items.length < n) comp.items.push({ score: "" });
      comp.items.length = n;
      render();
      return;
    }
  }
}

function onClick(e) {
  const t = e.target.closest("[data-action]");
  if (!t || t.tagName === "INPUT") return;
  const { action } = t.dataset;

  if (action === "add-course") {
    state.courses.push(makeCourse());
  } else {
    const course = findCourse(t.dataset.course);
    if (!course) return;
    if (action === "remove-course") {
      if (!confirm(`“${course.name}” dersini silmek istiyor musun?`)) return;
      state.courses = state.courses.filter((c) => c !== course);
    } else if (action === "remove-comp") {
      course.components = course.components.filter((c) => c.id !== t.dataset.comp);
    } else if (action === "add-comp") {
      const select = document.querySelector(`select[data-role="comp-type"][data-course="${course.id}"]`);
      if (!select || !select.value) return;
      course.components.push(makeComponent(select.value));
    } else {
      return;
    }
  }
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("input", onInput);
  document.addEventListener("change", onInput);
  document.addEventListener("click", onClick);
  state.courses.push(makeCourse("Matematik"));
  render();
});
