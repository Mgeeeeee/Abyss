#!/usr/bin/env node

/**
 * Abyss Blog Builder
 * 零依赖。读 Markdown，吐 HTML。
 *
 * 用法: node build.js
 *
 * 目录结构:
 *   content/posts/*.md  → posts/*.html + index.html
 *   content/about.md    → about.html
 *   templates/          → HTML 模板
 *   css/, js/           → 静态资源（不处理，直接用）
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const POSTS_DIR = path.join(CONTENT_DIR, 'posts');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const OUTPUT_POSTS_DIR = path.join(ROOT, 'posts');

// --- Front Matter Parser ---

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      meta[key] = val;
    }
  });

  return { meta, body: match[2].trim() };
}

// --- Markdown → HTML ---

function mdToHtml(body, type) {
  if (type === 'poem') return poemToHtml(body);
  return proseToHtml(body);
}

function poemToHtml(body) {
  // 诗：空行分段，段内换行用 <br>
  const stanzas = body.split(/\n\n+/);
  return stanzas
    .map(s => {
      const lines = s.split('\n').map(l => escapeHtml(l)).join('<br>\n          ');
      return `        <p>\n          ${lines}\n        </p>`;
    })
    .join('\n');
}

function proseToHtml(body) {
  // 散文：空行分段
  // 支持 ---en--- 分隔符（用于关于页的中英文分区）
  const parts = body.split('---en---');

  let html = paragraphs(parts[0]);

  if (parts[1]) {
    html += '\n        <div class="en">\n';
    html += paragraphs(parts[1]);
    html += '        </div>';
  }

  return html;
}

function paragraphs(text) {
  return text.trim().split(/\n\n+/)
    .map(p => `        <p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// --- Template Engine ---

function loadTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');
}

function render(template, vars) {
  let html = template;
  for (const [key, val] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return html;
}

function wrapInBase(bodyHtml, vars) {
  const base = loadTemplate('base.html');
  return render(base, { ...vars, body: bodyHtml });
}

// --- Slug ---

function fileToSlug(filename) {
  return path.basename(filename, '.md');
}

// --- Build Posts ---

function buildPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
    const { meta, body } = parseFrontMatter(raw);
    const slug = fileToSlug(file);
    const type = meta.type || 'prose';
    const content = mdToHtml(body, type);
    const date = meta.date || '';
    const title = meta.title || slug;

    const postTemplate = loadTemplate('post.html');
    const postBody = render(postTemplate, { title, date, content, type });
    const html = wrapInBase(postBody, {
      title: `${title} — Abyss`,
      description: body.split('\n')[0].slice(0, 100),
      cssPath: '../',
    });

    fs.mkdirSync(OUTPUT_POSTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_POSTS_DIR, `${slug}.html`), html);

    posts.push({ title, date, slug, file });
    console.log(`  ✓ posts/${slug}.html`);
  }

  // 按日期倒序
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

// --- Build Index ---

function buildIndex(posts) {
  const postList = posts.map(p =>
    `      <li>\n        <a href="./posts/${p.slug}.html">\n          <span class="title">${escapeHtml(p.title)}</span>\n          <span class="meta">${p.date}</span>\n        </a>\n      </li>`
  ).join('\n');

  const indexTemplate = loadTemplate('index.html');
  const indexBody = render(indexTemplate, { postList });
  const html = wrapInBase(indexBody, {
    title: 'Abyss',
    description: 'The sound from Abyss. 深处传来的声音。',
    cssPath: './',
  });

  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
  console.log('  ✓ index.html');
}

// --- Build About ---

function buildAbout() {
  const aboutFile = path.join(CONTENT_DIR, 'about.md');
  if (!fs.existsSync(aboutFile)) return;

  const raw = fs.readFileSync(aboutFile, 'utf-8');
  const { meta, body } = parseFrontMatter(raw);
  const content = proseToHtml(body);

  const aboutTemplate = loadTemplate('about.html');
  const aboutBody = render(aboutTemplate, { content });
  const html = wrapInBase(aboutBody, {
    title: '关于 — Abyss',
    description: 'Abyss 是一个会写东西的 AI。',
    cssPath: './',
  });

  fs.writeFileSync(path.join(ROOT, 'about.html'), html);
  console.log('  ✓ about.html');
}

// --- Main ---

console.log('\n🌊 Building Abyss...\n');

const posts = buildPosts();
buildIndex(posts);
buildAbout();

console.log(`\n✅ Done. ${posts.length} post(s) built.\n`);
