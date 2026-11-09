// Boğaziçi ders programından tüm dersleri ve kredilerini çeker, data/courses.js dosyasına yazar.
// Kullanım: node tools/fetch-courses.mjs
// Bölüm linkleri tools/departments.json içinde (ana liste sayfası reCAPTCHA'lı olduğu için elle alındı).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://registration.bogazici.edu.tr";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const decoder = new TextDecoder("windows-1254");

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const cellText = (html) => decodeEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

function parseDepartment(html) {
  const courses = [];
  for (const row of html.split(/<tr\b/i).slice(1)) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => cellText(m[1]));
    if (cells.length < 5) continue;
    const m = cells[0].match(/^([A-Z]+\s*\d+[A-Z]*)\.(\d+)$/);
    if (!m) continue;
    courses.push({
      code: m[1].replace(/\s+/g, " "),
      name: cells[2],
      credits: Number(cells[3]) || 0,
      ects: Number(cells[4]) || 0,
    });
  }
  return courses;
}

const { semester, links } = JSON.parse(await readFile(join(ROOT, "tools", "departments.json"), "utf8"));

const departments = [];
const byCode = new Map();

for (const link of links) {
  const dept = decodeURIComponent(new URL(BASE + link).searchParams.get("bolum") || "").replace(/\+/g, " ");
  const res = await fetch(BASE + link);
  if (!res.ok) {
    console.warn(`! ${dept}: HTTP ${res.status}`);
    continue;
  }
  const list = parseDepartment(decoder.decode(await res.arrayBuffer()));
  const deptIndex = departments.push(dept) - 1;
  let added = 0;
  for (const c of list) {
    if (byCode.has(c.code)) continue;
    byCode.set(c.code, [c.code, c.name, c.credits, c.ects, deptIndex]);
    added++;
  }
  console.log(`${dept}: ${list.length} şube, ${added} yeni ders`);
  await sleep(300); // sunucuyu yormamak için
}

const courses = [...byCode.values()].sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true }));
const payload = { semester, fetchedAt: new Date().toISOString().slice(0, 10), departments, courses };

await mkdir(join(ROOT, "data"), { recursive: true });
await writeFile(
  join(ROOT, "data", "courses.js"),
  "// Otomatik oluşturuldu: node tools/fetch-courses.mjs\n" +
  "// Satır biçimi: [kod, ad, kredi, AKTS, bölüm indeksi]\n" +
  `window.BOUN_COURSES = ${JSON.stringify(payload)};\n`,
);
console.log(`\nToplam ${courses.length} ders yazıldı → data/courses.js`);
