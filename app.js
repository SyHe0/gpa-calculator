"use strict";

// ---------- Bileşen türleri ----------
const COMPONENT_TYPES = {
  midterm:  { label: "Vize (Midterm)",     itemLabel: "Vize",     multi: true,  defaultCount: 1 },
  quiz:     { label: "Quiz",               itemLabel: "Quiz",     multi: true,  defaultCount: 2 },
  homework: { label: "Ödev / Proje",       itemLabel: "Ödev",     multi: true,  defaultCount: 1 },
  activity: { label: "Ders Dışı Etkinlik", itemLabel: "Etkinlik", multi: true,  defaultCount: 1 },
  final:    { label: "Final",              itemLabel: "Final",    multi: false, defaultCount: 1 },
};

// Varsayılan harf notu skalası (alt sınır, 4'lük sistem karşılığı)
const DEFAULT_SCALE = [
  { letter: "AA", min: 90, points: 4.0 },
  { letter: "BA", min: 85, points: 3.5 },
  { letter: "BB", min: 80, points: 3.0 },
  { letter: "CB", min: 75, points: 2.5 },
  { letter: "CC", min: 70, points: 2.0 },
  { letter: "DC", min: 65, points: 1.5 },
  { letter: "DD", min: 60, points: 1.0 },
  { letter: "FD", min: 50, points: 0.5 },
  { letter: "FF", min: 0,  points: 0.0 },
];

// ---------- Durum ----------
let state = { courses: [], scale: DEFAULT_SCALE.map((r) => ({ ...r })) };

const uid = () => Math.random().toString(36).slice(2, 10);
const num = (v) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
const fmt = (v, d = 2) => (v === null ? "—" : Number(v).toFixed(d).replace(/\.?0+$/, "") || "0");

function makeComponent(type, weight = 0) {
  const def = COMPONENT_TYPES[type];
  return {
    id: uid(),
    type,
    weight,
    customShares: false,
    items: Array.from({ length: def.defaultCount }, () => ({ score: "", share: "" })),
  };
}

function makeCourse(name) {
  return {
    id: uid(),
    name: name || `Ders ${state.courses.length + 1}`,
    credits: 3,
    components: [makeComponent("midterm", 40), makeComponent("quiz", 10), makeComponent("final", 50)],
  };
}

const findCourse = (id) => state.courses.find((c) => c.id === id);
const findComponent = (course, id) => course.components.find((c) => c.id === id);

// ---------- Hesaplama ----------

// Bir bileşen içindeki her öğenin bileşene göre payı (%)
function itemShares(comp) {
  const n = comp.items.length;
  if (!comp.customShares) return comp.items.map(() => 100 / n);
  return comp.items.map((it) => num(it.share) ?? 0);
}

// Bileşen ortalaması: sadece girilmiş notlar, paylarına göre
function componentAverage(comp) {
  const shares = itemShares(comp);
  let total = 0, covered = 0;
  comp.items.forEach((it, i) => {
    const s = num(it.score);
    if (s === null) return;
    total += s * shares[i];
    covered += shares[i];
  });
  return {
    avg: covered > 0 ? total / covered : null,
    shareSum: shares.reduce((a, b) => a + b, 0),
    coveredShare: covered,
  };
}

function courseResult(course) {
  let weightSum = 0, total = 0, coveredWeight = 0;
  for (const comp of course.components) {
    const w = num(comp.weight) ?? 0;
    weightSum += w;
    const { avg, shareSum, coveredShare } = componentAverage(comp);
    if (avg === null || shareSum <= 0) continue;
    // Bileşenin girilmiş kısmı kadar ağırlık say
    const effW = w * Math.min(1, coveredShare / shareSum);
    total += avg * effW;
    coveredWeight += effW;
  }
  const score = coveredWeight > 0 ? total / coveredWeight : null;
  const grade = score === null ? null : letterFor(score);
  return { weightSum, coveredWeight, score, grade };
}

function letterFor(score) {
  const sorted = [...state.scale].sort((a, b) => b.min - a.min);
  return sorted.find((r) => score >= r.min) || sorted[sorted.length - 1];
}

function computeGPA() {
  let pts = 0, credits = 0;
  for (const c of state.courses) {
    const r = courseResult(c);
    const cr = num(c.credits) ?? 0;
    if (!r.grade || cr <= 0) continue;
    pts += r.grade.points * cr;
    credits += cr;
  }
  return { gpa: credits > 0 ? pts / credits : null, credits };
}

// ---------- DOM yardımcıları ----------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k === "checked") node.checked = !!v;
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// ---------- Render ----------
function weightControl(course, comp) {
  const data = { action: "weight", course: course.id, comp: comp.id };
  return el("div", { class: "weight" },
    el("input", { type: "range", min: 0, max: 100, step: 1, value: comp.weight, dataset: data, "aria-label": "Ağırlık" }),
    el("input", { type: "number", min: 0, max: 100, step: "any", value: comp.weight, dataset: data }),
    el("span", { class: "pct" }, "%"));
}

function renderComponent(course, comp) {
  const def = COMPONENT_TYPES[comp.type];
  const shares = itemShares(comp);

  const countControl = def.multi
    ? el("label", { class: "count" }, "Adet",
        el("input", {
          type: "number", min: 1, max: 20, value: comp.items.length,
          dataset: { action: "count", course: course.id, comp: comp.id },
        }))
    : null;

  const shareToggle = def.multi && comp.items.length > 1
    ? el("label", { class: "toggle" },
        el("input", {
          type: "checkbox", checked: comp.customShares,
          dataset: { action: "custom-shares", course: course.id, comp: comp.id },
        }), "Ayrı yüzdeler")
    : null;

  const items = comp.items.map((item, i) =>
    el("div", { class: "item" },
      el("span", {}, def.multi ? `${def.itemLabel} ${i + 1}` : def.itemLabel),
      el("input", {
        type: "number", min: 0, max: 100, step: "any", placeholder: "Not (0-100)", value: item.score,
        dataset: { action: "score", course: course.id, comp: comp.id, index: i },
      }),
      comp.customShares
        ? el("label", { class: "share" }, "Pay",
            el("input", {
              type: "number", min: 0, max: 100, step: "any", value: item.share, placeholder: "%",
              dataset: { action: "share", course: course.id, comp: comp.id, index: i },
            }), "%")
        : el("span", { class: "share-info", dataset: { shareInfo: comp.id, index: i } },
            `Derse etkisi: %${fmt((num(comp.weight) ?? 0) * shares[i] / 100)}`)));

  return el("div", { class: "component", dataset: { type: comp.type } },
    el("div", { class: "component-head" },
      el("strong", {}, def.label),
      weightControl(course, comp),
      countControl,
      shareToggle,
      el("button", {
        class: "icon-btn", title: "Bileşeni kaldır",
        dataset: { action: "remove-comp", course: course.id, comp: comp.id },
      }, "×")),
    el("div", { class: "items" }, items),
    comp.customShares ? el("div", { class: "share-sum", dataset: { shareSum: comp.id } }) : null);
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
    el("div", { class: "course-foot" },
      el("div", { class: "add-comp" },
        el("select", { dataset: { role: "comp-type", course: course.id } }, addOptions),
        el("button", { class: "btn", dataset: { action: "add-comp", course: course.id } }, "+ Bileşen ekle")),
      el("div", { class: "course-result", dataset: { result: course.id } })));
}

function renderSummary() {
  const { gpa, credits } = computeGPA();
  const box = document.getElementById("summary");
  box.replaceChildren(
    el("div", { class: "stat" }, el("span", {}, "Dönem GPA"), el("b", { class: "big" }, gpa === null ? "—" : gpa.toFixed(2))),
    el("div", { class: "stat" }, el("span", {}, "Hesaba katılan kredi"), el("b", {}, fmt(credits))),
    el("div", { class: "stat" }, el("span", {}, "Ders sayısı"), el("b", {}, state.courses.length)));
}

// Yeniden render etmeden sonuçları günceller (odak kaybolmasın diye)
function updateResults() {
  for (const course of state.courses) {
    const r = courseResult(course);
    const box = document.querySelector(`[data-result="${course.id}"]`);
    if (box) {
      const okWeight = Math.abs(r.weightSum - 100) < 0.01;
      box.replaceChildren(
        el("span", { class: `badge ${okWeight ? "ok" : "bad"}` },
          `Toplam ağırlık: %${fmt(r.weightSum)}${okWeight ? "" : " (100 olmalı)"}`),
        el("span", { class: "badge" }, `Girilen kısım: %${fmt(r.coveredWeight)}`),
        el("span", { class: "result-score" },
          "Ortalama: ", el("b", {}, fmt(r.score)),
          r.grade ? el("span", { class: "letter" }, `${r.grade.letter} · ${r.grade.points.toFixed(2)}`) : null));
    }

    for (const comp of course.components) {
      const shares = itemShares(comp);
      document.querySelectorAll(`[data-share-info="${comp.id}"]`).forEach((n) => {
        n.textContent = `Derse etkisi: %${fmt((num(comp.weight) ?? 0) * shares[Number(n.dataset.index)] / 100)}`;
      });
      const sumBox = document.querySelector(`[data-share-sum="${comp.id}"]`);
      if (sumBox) {
        const s = shares.reduce((a, b) => a + b, 0);
        const ok = Math.abs(s - 100) < 0.01;
        sumBox.className = `share-sum ${ok ? "ok" : "bad"}`;
        sumBox.textContent = `Payların toplamı: %${fmt(s)}${ok ? "" : " (100 olmalı)"}`;
      }
    }
  }
  renderSummary();
}

function render() {
  const root = document.getElementById("courses");
  root.replaceChildren();
  if (state.courses.length === 0) {
    root.append(el("p", { class: "empty" }, "Henüz ders yok. Başlamak için “+ Ders ekle” butonuna bas."));
  }
  state.courses.forEach((c) => root.append(renderCourse(c)));
  updateResults();
}

// ---------- Olaylar ----------
function onInput(e) {
  const t = e.target;
  const { action } = t.dataset;
  if (!action) return;
  const course = findCourse(t.dataset.course);
  if (!course) return;
  const comp = t.dataset.comp ? findComponent(course, t.dataset.comp) : null;

  switch (action) {
    case "name":
      course.name = t.value;
      break;
    case "credits":
      course.credits = t.value;
      break;
    case "score":
      comp.items[Number(t.dataset.index)].score = t.value;
      break;
    case "share":
      comp.items[Number(t.dataset.index)].share = t.value;
      break;
    case "weight":
      comp.weight = t.value;
      // Kaydırıcı ile sayı kutusunu senkron tut
      document.querySelectorAll(`[data-action="weight"][data-comp="${comp.id}"]`).forEach((n) => {
        if (n !== t) n.value = t.value;
      });
      break;
    case "custom-shares":
      if (e.type !== "change") return;
      comp.customShares = t.checked;
      if (comp.customShares) {
        const eq = +(100 / comp.items.length).toFixed(2);
        comp.items.forEach((it) => { if (num(it.share) === null) it.share = eq; });
      }
      render();
      return;
    case "count": {
      if (e.type !== "change") return;
      const n = Math.max(1, Math.min(20, parseInt(t.value, 10) || 1));
      while (comp.items.length < n) comp.items.push({ score: "", share: "" });
      comp.items.length = n;
      if (n === 1) comp.customShares = false;
      render();
      return;
    }
    default:
      return;
  }
  updateResults();
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
