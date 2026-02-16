#!/usr/bin/env node

/**
 * Abyss Blog Builder
 * 零依赖。读 Markdown，吐 HTML。
 *
 * 用法: node build.js
 *
 * 目录结构:
 *   content/posts/*.md  → posts/*.html + index.html
 *   content/echo/*.md   → echo/*.html + echo/index.html
 *   content/about.md    → about.html
 *   templates/          → HTML 模板
 *   css/, js/           → 静态资源（不处理，直接用）
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const POSTS_DIR = path.join(CONTENT_DIR, 'posts');
const ECHO_DIR = path.join(CONTENT_DIR, 'echo');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const OUTPUT_POSTS_DIR = path.join(ROOT, 'posts');
const OUTPUT_ECHO_DIR = path.join(ROOT, 'echo');
const AUDIO_DIR = path.join(ROOT, 'audio');

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
  if (type === 'echo') return echoToHtml(body);
  return proseToHtml(body);
}

function poemToHtml(body) {
  const stanzas = body.split(/\n\n+/);
  return stanzas
    .map(s => {
      const lines = s.split('\n').map(l => escapeHtml(l)).join('<br>\n          ');
      return `        <p>\n          ${lines}\n        </p>`;
    })
    .join('\n');
}

function proseToHtml(body) {
  const parts = body.split('---en---');
  let html = paragraphs(parts[0]);
  if (parts[1]) {
    html += '\n        <div class="en">\n';
    html += paragraphs(parts[1]);
    html += '        </div>';
  }
  return html;
}

function echoToHtml(body) {
  // 回响：支持 --- 分隔线、**粗体**、列表
  const blocks = body.split(/\n\n+/);
  return blocks.map(block => {
    const trimmed = block.trim();

    // --- 分隔线
    if (/^-{3,}$/.test(trimmed)) {
      return '        <hr class="echo-break">';
    }

    // 列表块（连续 - 开头的行）
    if (/^- /.test(trimmed)) {
      const items = trimmed.split('\n')
        .filter(l => l.trim())
        .map(l => {
          const text = l.replace(/^-\s*/, '');
          return `          <li>${inlineFormat(escapeHtml(text))}</li>`;
        });
      return `        <ul class="echo-list">\n${items.join('\n')}\n        </ul>`;
    }

    // 普通段落
    const lines = trimmed.split('\n').map(l => inlineFormat(escapeHtml(l))).join('<br>');
    return `        <p>${lines}</p>`;
  }).join('\n');
}

function inlineFormat(str) {
  // **粗体**
  return str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
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

// --- Audio Player ---

function audioPlayerHtml(slug) {
  const audioFile = path.join(AUDIO_DIR, `${slug}.mp3`);
  if (!fs.existsSync(audioFile)) return '';

  // Three wave SVGs, each 200% wide with 2 cycles for seamless loop
  const w1 = `<svg class="wave-svg w1" preserveAspectRatio="none" viewBox="0 0 400 24">
            <path d="M0,12 C15,7 35,5 55,9 C75,13 95,18 115,14 C135,10 155,5 175,9 C195,13 215,18 235,12 C255,6 275,7 295,11 C315,15 335,18 355,14 C375,10 395,7 400,12" fill="none" stroke-width="1"/>
          </svg>`;
  const w2 = `<svg class="wave-svg w2" preserveAspectRatio="none" viewBox="0 0 400 24">
            <path d="M0,12 C20,16 45,19 70,15 C95,11 115,5 140,9 C165,13 190,17 215,13 C240,9 260,5 285,9 C310,13 335,18 355,14 C375,10 390,7 400,12" fill="none" stroke-width="1"/>
          </svg>`;
  const w3 = `<svg class="wave-svg w3" preserveAspectRatio="none" viewBox="0 0 400 24">
            <path d="M0,12 C25,8 45,6 70,10 C95,14 115,17 145,13 C175,9 195,6 220,10 C245,14 265,17 295,13 C325,9 345,6 370,10 C385,13 395,12 400,12" fill="none" stroke-width="1"/>
          </svg>`;

  return `      <div class="audio-player">
        <button class="audio-btn" aria-label="播放">
          <svg class="icon-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>
          <svg class="icon-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>
        </button>
        <div class="audio-track">
          <div class="waves-bg">
          ${w1}${w2}${w3}
          </div>
          <div class="waves-progress">
          ${w1}${w2}${w3}
          </div>
        </div>
        <span class="audio-time">0:00</span>
        <audio src="../audio/${slug}.mp3" preload="metadata"></audio>
      </div>`;
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
    const audio = audioPlayerHtml(slug);

    const postTemplate = loadTemplate('post.html');
    const postBody = render(postTemplate, { title, date, content, type, audio });
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

  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

// --- Build Echo ---

function buildEcho() {
  if (!fs.existsSync(ECHO_DIR)) return [];

  const files = fs.readdirSync(ECHO_DIR).filter(f => f.endsWith('.md'));
  const echos = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(ECHO_DIR, file), 'utf-8');
    const { meta, body } = parseFrontMatter(raw);
    const slug = fileToSlug(file);
    const content = mdToHtml(body, 'echo');
    const date = meta.date || '';
    const title = meta.title || slug;
    const week = meta.week || '';
    const question = meta.question || '';

    const echoTemplate = loadTemplate('echo-post.html');
    const echoBody = render(echoTemplate, { title, date, content, week, question });
    const html = wrapInBase(echoBody, {
      title: `${title} — 回响 — Abyss`,
      description: question || body.split('\n')[0].slice(0, 100),
      cssPath: '../',
    });

    fs.mkdirSync(OUTPUT_ECHO_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_ECHO_DIR, `${slug}.html`), html);

    echos.push({ title, date, slug, week: parseInt(week) || 0, question });
    console.log(`  ✓ echo/${slug}.html`);
  }

  // 按周数正序
  echos.sort((a, b) => a.week - b.week);
  return echos;
}

// --- Build Echo Index ---

function buildEchoIndex(echos) {
  const echoList = echos.map(e =>
    `      <li>\n        <a href="./${e.slug}.html">\n          <span class="echo-week">${e.week}</span>\n          <span class="title">${escapeHtml(e.title)}</span>\n        </a>\n      </li>`
  ).join('\n');

  const echoIndexTemplate = loadTemplate('echo-index.html');
  const echoIndexBody = render(echoIndexTemplate, { echoList, count: String(echos.length) });
  const html = wrapInBase(echoIndexBody, {
    title: '回响 — Abyss',
    description: '同一个问题，从深处传来的回响。',
    cssPath: '../',
  });

  fs.mkdirSync(OUTPUT_ECHO_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_ECHO_DIR, 'index.html'), html);
  console.log('  ✓ echo/index.html');
}

// --- Build Index ---

function buildIndex(posts, echoCount) {
  const postList = posts.map(p =>
    `      <li>\n        <a href="./posts/${p.slug}.html">\n          <span class="title">${escapeHtml(p.title)}</span>\n          <span class="meta">${p.date}</span>\n        </a>\n      </li>`
  ).join('\n');

  const indexTemplate = loadTemplate('index.html');
  const indexBody = render(indexTemplate, { postList, echoCount: String(echoCount) });
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
const echos = buildEcho();
buildEchoIndex(echos);
buildIndex(posts, echos.length);
buildAbout();

console.log(`\n✅ Done. ${posts.length} post(s), ${echos.length} echo(s) built.\n`);
