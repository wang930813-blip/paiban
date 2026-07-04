const rawInput = document.querySelector('#rawInput');
const titleInput = document.querySelector('#titleInput');
const summaryInput = document.querySelector('#summaryInput');
const keyInput = document.querySelector('#keyInput');
const catalogInput = document.querySelector('#catalogInput');
const accentInput = document.querySelector('#accentInput');
const preview = document.querySelector('#preview');
const analyzeBtn = document.querySelector('#analyzeBtn');
const demoBtn = document.querySelector('#demoBtn');
const copyRichBtn = document.querySelector('#copyRichBtn');
const copyPlainBtn = document.querySelector('#copyPlainBtn');
const toast = document.querySelector('#toast');

const demoText = `从零搭建高完读率公众号写作系统

这是一套面向新媒体运营者、知识博主和课程主理人的写作训练方案。你会学到从选题、标题、正文结构到转化引导的完整方法。

现在报名可获得课程回放、选题模板、标题公式表和 3 次作业点评。

课程目录
- [第一课：内容定位与选题公式](https://example.com/course-1)
- [第二课：爆款标题与开头设计](https://example.com/course-2)
- [第三课：正文结构与案例拆解](https://example.com/course-3)
- [第四课：结尾转化与私域承接](https://example.com/course-4)

为什么你的文章读者留不住

很多文章的问题出在阅读节奏。标题吸引人，正文却像一整块文字墙，读者很快就会退出。

高完读率文章的关键，是让读者每一屏都知道自己读到了哪里。

排版的目标是降低阅读阻力，让重要信息更快被看见。

这套课程适合谁

- 刚开始做公众号，想建立稳定输出方法的人
- 已经在写文章，但阅读完成率长期偏低的人
- 正在卖课、做咨询、做知识付费，需要提升内容转化的人

你会得到什么

建立选题库：用读者问题、产品卖点和内容资产三个维度搭建选题库。

写出更稳的文章结构：掌握开头承诺、正文递进、结尾行动的三段式表达。

把重点自然呈现出来：通过高亮块、清单和引用，让读者快速抓住核心价值。`;

let latestHtml = '';
let latestText = '';

const keyPalette = ['#b45309', '#0f766e', '#7c3aed', '#be123c', '#2563eb'];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function keyColor(index) {
  return keyPalette[index % keyPalette.length];
}

function normalizeLine(line) {
  return line.trim().replace(/^[-*•]\s+/, '').replace(/^\d+[.)、]\s+/, '');
}

function isCatalogTitle(text) {
  return /^(课程目录|课程安排|课程大纲|学习目录|课程列表|课程清单)$/.test(text.trim());
}

function isCatalogItem(text) {
  return /\[.+\]\(https?:\/\//.test(text) || /第[一二三四五六七八九十\d]+[课节讲]/.test(text) || /https?:\/\//.test(text);
}

function parseCatalogLine(line) {
  const text = normalizeLine(line);
  const link = text.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
  if (link) return { title: link[1], url: link[2] };
  const url = text.match(/(https?:\/\/\S+)/);
  if (url) return { title: text.replace(url[1], '').trim() || url[1], url: url[1] };
  return { title: text, url: '' };
}

function classifyLines(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim());
  const useful = lines.filter(Boolean);
  const title = (useful[0] || '未命名文章').replace(/^#+\s*/, '');
  const bodyLines = lines.slice(lines.findIndex((line) => line.trim()) + 1);
  const catalog = [];
  const contentLines = [];
  let catalogMode = false;

  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!catalogMode) contentLines.push('');
      continue;
    }
    const plain = trimmed.replace(/^#+\s*/, '');
    if (isCatalogTitle(plain)) {
      catalogMode = true;
      continue;
    }
    if (catalogMode) {
      if (isCatalogItem(trimmed)) {
        catalog.push(parseCatalogLine(trimmed));
        continue;
      }
      catalogMode = false;
    }
    contentLines.push(trimmed);
  }

  return { title, contentLines, catalog };
}

function scoreKey(text) {
  const clean = normalizeLine(text).replace(/^#+\s*/, '');
  if (clean.length < 12 || clean.length > 140) return 0;
  let score = 0;
  const rules = [
    [/(现在|立即|报名|限时|名额|优惠|赠送|福利|回放|模板|点评|交付)/, 6],
    [/(核心|关键|重点|本质|原则|方法|系统|结构|公式|路径|框架)/, 5],
    [/(获得|学到|掌握|提升|解决|建立|搭建|形成|适合|帮助)/, 4],
    [/(完读率|转化|留存|增长|效率|价值|结果|承诺|案例|复盘)/, 3],
    [/(你会|你将|可以|能够|读者|用户|课程|文章|内容)/, 2],
  ];
  rules.forEach(([pattern, value]) => {
    if (pattern.test(clean)) score += value;
  });
  if (/[:：]/.test(clean)) score += 2;
  if (clean.length >= 24 && clean.length <= 92) score += 2;
  return score;
}

function splitBlocks(lines) {
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    const text = paragraph.join('').trim();
    if (text) blocks.push({ type: blocks.length ? 'p' : 'lead', text });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', items: [...list] });
    list = [];
  };

  lines.forEach((line) => {
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: heading[1].trim() });
      return;
    }
    if (/^[一二三四五六七八九十]+[、.．]\s*.+/.test(line) || (/^[^，。！？]{4,22}$/.test(line) && scoreKey(line) <= 4)) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: line.replace(/^([一二三四五六七八九十]+[、.．])\s*/, '') });
      return;
    }
    const quote = line.match(/^>\s*(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'quote', text: quote[1].trim() });
      return;
    }
    const listItem = line.match(/^([-*•]|\d+[.)])\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[2].trim());
      return;
    }
    flushList();
    paragraph.push(line.replace(/^(重点[:：]|重要[:：])/, ''));
  });

  flushParagraph();
  flushList();
  return blocks;
}

function pickKeys(blocks) {
  const candidates = [];
  blocks.forEach((block) => {
    if (block.type === 'p' || block.type === 'lead' || block.type === 'quote') {
      const score = scoreKey(block.text);
      if (score >= 7) candidates.push({ text: block.text, score });
    }
    if (block.type === 'list') {
      block.items.forEach((item) => {
        const score = scoreKey(item);
        if (score >= 7) candidates.push({ text: item, score });
      });
    }
  });
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((item, index, arr) => arr.findIndex((other) => other.text === item.text) === index)
    .slice(0, 5)
    .map((item) => item.text);
}

function analyzeContent() {
  const classified = classifyLines(rawInput.value);
  const blocks = splitBlocks(classified.contentLines);
  const keys = pickKeys(blocks);
  const summary = blocks.find((block) => block.type === 'lead')?.text || classified.contentLines.find((line) => line.length > 20) || '';

  titleInput.value = classified.title;
  summaryInput.value = summary;
  keyInput.value = keys.map((item) => `- ${item}`).join('\n');
  catalogInput.value = classified.catalog.map((item) => `- ${item.url ? `[${item.title}](${item.url})` : item.title}`).join('\n');

  renderAll(blocks);
}

function parseCatalogInput() {
  return catalogInput.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCatalogLine);
}

function parseKeyInput() {
  return keyInput.value
    .split('\n')
    .map((line) => normalizeLine(line).replace(/^(重点[:：]|重要[:：])/, '').trim())
    .filter(Boolean);
}

function inline(text) {
  const accent = accentInput.value;
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="article-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/==(.+?)==/g, `<span class="inline-mark">$1</span>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${accent}">$1</strong>`);
}

function renderAll(existingBlocks) {
  const classified = classifyLines(rawInput.value);
  const blocks = existingBlocks || splitBlocks(classified.contentLines);
  const keys = parseKeyInput();
  const catalog = parseCatalogInput();
  const accent = accentInput.value;

  preview.style.setProperty('--article-accent', accent);
  preview.style.setProperty('--article-accent-soft', hexToRgba(accent, 0.11));
  preview.style.setProperty('--article-accent-faint', hexToRgba(accent, 0.055));

  preview.innerHTML = `
    <div class="article-sheet">
      <header class="article-title-block">
        <span>AI 智能优选版式</span>
        <h1>${inline(titleInput.value || classified.title)}</h1>
      </header>
      ${summaryInput.value.trim() ? `<section class="article-summary"><p>${inline(summaryInput.value)}</p></section>` : ''}
      ${keys.length ? renderKeys(keys) : ''}
      <section class="article-body">${blocks.map(renderBlock).join('')}</section>
      ${catalog.length ? renderCatalog(catalog) : ''}
      <footer class="article-end"><strong>读完建议</strong><p>先看重点，再按正文结构复盘，最后从课程目录进入对应内容。</p></footer>
    </div>
  `;

  latestHtml = buildClipboard(blocks, keys, catalog);
  latestText = buildPlain(blocks, keys, catalog);
}

function renderKeys(keys) {
  return `
    <section class="key-section">
      <div class="section-label">重点内容</div>
      ${keys.map((item, index) => `<div class="key-card" style="--key-color:${keyColor(index)};--key-soft:${hexToRgba(keyColor(index), 0.1)}"><span></span><p>${inline(item)}</p></div>`).join('')}
    </section>
  `;
}

function renderCatalog(catalog) {
  return `
    <details class="catalog-section" open>
      <summary><strong>课程目录</strong><em>${catalog.length} 项 · 点击折叠</em></summary>
      ${catalog.map((item, index) => {
        const content = `<span></span><p>${inline(item.title)}</p><em>访问</em>`;
        return item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${content}</a>` : `<div>${content}</div>`;
      }).join('')}
    </details>
  `;
}

function renderBlock(block) {
  if (block.type === 'lead') return `<p class="lead-text">${inline(block.text)}</p>`;
  if (block.type === 'p') return `<p>${inline(block.text)}</p>`;
  if (block.type === 'h2') return `<h2>${inline(block.text)}</h2>`;
  if (block.type === 'quote') return `<blockquote>${inline(block.text)}</blockquote>`;
  if (block.type === 'list') return `<div class="clean-list">${block.items.map((item) => `<div><span></span><p>${inline(item)}</p></div>`).join('')}</div>`;
  return '';
}

function styleText(styles) {
  return Object.entries(styles).map(([key, value]) => `${key}:${value}`).join(';');
}

function inlineForCopy(text) {
  const accent = accentInput.value;
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:${accent};font-weight:800;text-decoration:none;border-bottom:1px solid ${hexToRgba(accent, 0.34)};">$1</a>`)
    .replace(/==(.+?)==/g, `<span style="padding:1px 6px;border-radius:8px;background:${hexToRgba(accent, 0.12)};color:${accent};font-weight:800;">$1</span>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${accent};font-weight:800;">$1</strong>`);
}

function buildClipboard(blocks, keys, catalog) {
  const accent = accentInput.value;
  const ink = '#211d18';
  const muted = '#71685c';
  const keyHtml = keys.length ? `<section style="${styleText({ margin: '28px 0', padding: '20px', 'border-radius': '24px', background: hexToRgba(accent, 0.065), border: `1px solid ${hexToRgba(accent, 0.18)}` })}"><strong style="${styleText({ display: 'block', color: accent, 'font-size': '15px', 'margin-bottom': '14px' })}">重点内容</strong>${keys.map((item, index) => {
    const color = keyColor(index);
    return `<div style="${styleText({ display: 'flex', gap: '12px', padding: '14px', 'border-radius': '16px', background: hexToRgba(color, 0.07), border: `1px solid ${hexToRgba(color, 0.24)}`, 'margin-top': index ? '10px' : '0', 'box-shadow': `inset 4px 0 0 ${color}` })}"><span style="${styleText({ width: '10px', height: '10px', 'border-radius': '999px', background: color, 'margin-top': '8px', 'flex': '0 0 auto' })}"></span><p style="${styleText({ margin: '0', color, 'font-size': '15px', 'line-height': '1.9', 'font-weight': '800' })}">${inlineForCopy(item)}</p></div>`;
  }).join('')}</section>` : '';
  const bodyHtml = blocks.map((block) => {
    if (block.type === 'lead') return `<p style="${styleText({ margin: '0 0 18px', padding: '0 0 12px', 'border-bottom': `1px solid ${hexToRgba(accent, 0.16)}`, color: ink, 'font-size': '17px', 'line-height': '2' })}">${inlineForCopy(block.text)}</p>`;
    if (block.type === 'p') return `<p style="${styleText({ margin: '0 0 18px', color: '#3b352f', 'font-size': '16px', 'line-height': '2.05' })}">${inlineForCopy(block.text)}</p>`;
    if (block.type === 'h2') return `<h2 style="${styleText({ margin: '38px 0 16px', color: ink, 'font-size': '24px', 'line-height': '1.5', 'font-family': `'Noto Serif SC','Source Han Serif SC','Songti SC',serif`, 'font-weight': '700' })}"><span style="${styleText({ display: 'inline-block', width: '8px', height: '24px', 'border-radius': '999px', background: accent, 'margin-right': '10px', 'vertical-align': '-4px' })}"></span>${inlineForCopy(block.text)}</h2>`;
    if (block.type === 'quote') return `<blockquote style="${styleText({ margin: '22px 0', padding: '18px 20px', 'border-radius': '18px', background: '#f7f1e8', border: `1px solid ${hexToRgba(accent, 0.14)}`, color: muted, 'font-size': '15px', 'line-height': '1.95' })}">${inlineForCopy(block.text)}</blockquote>`;
    if (block.type === 'list') return `<div style="${styleText({ margin: '20px 0 26px', padding: '18px', 'border-radius': '20px', background: '#f8f3ec', border: '1px solid rgba(40,35,28,0.06)' })}">${block.items.map((item, index) => `<div style="${styleText({ display: 'flex', gap: '12px', 'align-items': 'flex-start', 'margin-top': index ? '12px' : '0' })}"><span style="${styleText({ width: '8px', height: '8px', 'border-radius': '999px', background: accent, 'margin-top': '10px', 'flex': '0 0 auto' })}"></span><p style="${styleText({ margin: '0', color: '#3b352f', 'font-size': '15px', 'line-height': '1.95' })}">${inlineForCopy(item)}</p></div>`).join('')}</div>`;
    return '';
  }).join('');
  const catalogHtml = catalog.length ? `<details open style="${styleText({ margin: '34px 0 0', padding: '18px', 'border-radius': '22px', background: hexToRgba(accent, 0.065), border: `1px solid ${hexToRgba(accent, 0.18)}` })}"><summary style="${styleText({ color: accent, 'font-size': '15px', 'font-weight': '800', cursor: 'pointer', 'margin-bottom': '14px' })}">课程目录｜${catalog.length} 项</summary>${catalog.map((item, index) => `<p style="${styleText({ margin: index ? '10px 0 0' : '0', 'font-size': '15px', 'line-height': '1.8' })}">${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="${styleText({ color: ink, 'font-weight': '800', 'text-decoration': 'none' })}">` : ''}<span style="${styleText({ display: 'inline-block', width: '8px', height: '8px', 'border-radius': '999px', background: accent, 'margin-right': '10px', 'vertical-align': '1px' })}"></span>${inlineForCopy(item.title)}${item.url ? '</a>' : ''}</p>`).join('')}</details>` : '';
  const summaryHtml = summaryInput.value.trim()
    ? `<section style="${styleText({ margin: '18px 0 0', padding: '18px 20px', 'border-radius': '20px', background: hexToRgba(accent, 0.06), border: `1px solid ${hexToRgba(accent, 0.14)}` })}"><p style="${styleText({ margin: '0', color: muted, 'font-size': '15px', 'line-height': '1.9' })}">${inlineForCopy(summaryInput.value)}</p></section>`
    : '';
  const endHtml = `<footer style="${styleText({ margin: '36px 0 0', padding: '24px', 'border-radius': '26px', background: ink, color: '#fff' })}"><strong style="${styleText({ display: 'block', margin: '0 0 8px', 'font-size': '18px' })}">读完建议</strong><p style="${styleText({ margin: '0', color: 'rgba(255,255,255,.78)', 'font-size': '14px', 'line-height': '1.8' })}">先看重点，再按正文结构复盘，最后从课程目录进入对应内容。</p></footer>`;
  return `<article style="${styleText({ width: '100%', 'max-width': '677px', margin: '0 auto', padding: '38px 20px 56px', background: '#fffdf8', color: ink, 'font-family': `'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif` })}"><header style="${styleText({ padding: '0 0 20px', 'border-bottom': `1px solid ${hexToRgba(accent, 0.16)}` })}"><span style="${styleText({ display: 'inline-block', margin: '0 0 14px', padding: '7px 12px', 'border-radius': '999px', background: hexToRgba(accent, 0.12), color: accent, 'font-size': '12px', 'font-weight': '800' })}">AI 智能优选版式</span><h1 style="${styleText({ margin: '0', color: ink, 'font-size': '32px', 'line-height': '1.38', 'font-family': `'Noto Serif SC','Source Han Serif SC','Songti SC',serif`, 'font-weight': '700' })}">${inlineForCopy(titleInput.value)}</h1></header>${summaryHtml}${keyHtml}<section style="${styleText({ margin: '32px 0 0' })}">${bodyHtml}</section>${catalogHtml}${endHtml}</article>`;
}

function buildPlain(blocks, keys, catalog) {
  const body = blocks.map((block) => block.text || block.items?.join('\n') || '').filter(Boolean).join('\n\n');
  const keyText = keys.length ? `\n\n重点内容\n${keys.map((item) => `- ${item}`).join('\n')}` : '';
  const catalogText = catalog.length ? `\n\n课程目录\n${catalog.map((item) => `- ${item.title}${item.url ? ` ${item.url}` : ''}`).join('\n')}` : '';
  return `${titleInput.value}\n\n${summaryInput.value}${keyText}\n\n${body}${catalogText}`;
}

async function copyRich() {
  if (!latestHtml) return showToast('请先生成排版');
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([latestHtml], { type: 'text/html' }),
          'text/plain': new Blob([latestText], { type: 'text/plain' }),
        }),
      ]);
      showToast('富文本已完整复制，可直接粘贴到公众号');
      return;
    }
  } catch (error) {
    copyHtmlBySelection();
    return;
  }
  copyHtmlBySelection();
}

function copyHtmlBySelection() {
  const holder = document.createElement('div');
  holder.setAttribute('contenteditable', 'true');
  holder.style.position = 'fixed';
  holder.style.left = '-9999px';
  holder.style.top = '0';
  holder.style.width = '677px';
  holder.style.background = '#fff';
  holder.innerHTML = latestHtml;
  document.body.appendChild(holder);

  const range = document.createRange();
  range.selectNodeContents(holder);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand('copy');
  selection.removeAllRanges();
  holder.remove();
  showToast('富文本已完整复制，可直接粘贴到公众号');
}

async function copyPlain() {
  if (!latestText) return showToast('请先生成排版');
  await navigator.clipboard.writeText(latestText);
  showToast('纯文本已复制');
}

analyzeBtn.addEventListener('click', analyzeContent);
demoBtn.addEventListener('click', () => {
  rawInput.value = demoText;
  analyzeContent();
});
[titleInput, summaryInput, keyInput, catalogInput, accentInput].forEach((field) => field.addEventListener('input', () => renderAll()));
copyRichBtn.addEventListener('click', copyRich);
copyPlainBtn.addEventListener('click', copyPlain);

rawInput.value = demoText;
analyzeContent();
