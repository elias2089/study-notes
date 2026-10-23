'use strict';

const DOC_FILES = ['ENGLISH_DAILY.md', 'ENGLISH_INTERVIEW.md'];
const ITEM_RE = /^(\s*)- (?:([^\s:*]+): )?\*(.+?)\*\s*→\s*(.+?)\s*$/;
const PARAGRAPH_LABEL_RE = /^\*\*(English|Español)\*\*\s*$/;
const SETTINGS_KEY = 'english-listen-settings';

/**
 * Parses one study-notes markdown file into epigraphs → sections → items.
 * Items are `- *English* → Spanish` bullets (tense variations are nested
 * children) or paragraphs introduced by a `**English**` / `**Español**` label.
 */
function parseMarkdown(md) {
  const doc = { title: '', notes: [], epigraphs: [] };
  let epigraph = null;
  let section = null;
  let lastItem = null;
  let paragraphLang = null;

  const currentEpigraph = () => {
    if (!epigraph) {
      epigraph = { title: '', notes: [], sections: [] };
      doc.epigraphs.push(epigraph);
    }
    return epigraph;
  };
  const currentSection = () => {
    if (!section) {
      section = { title: '', items: [] };
      currentEpigraph().sections.push(section);
    }
    return section;
  };
  const addNote = (text) => {
    const target = section || epigraph || doc;
    (target.notes || (target.notes = [])).push(text);
  };
  let table = null;

  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    if (!line.startsWith('|')) table = null;

    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      if (!table) {
        // first row of a table is its header; a "Palabra" header marks a vocabulary table
        table = { words: cells[0] === 'Palabra', rows: [] };
        if (!table.words) currentSection().items.push({ type: 'table', header: cells, rows: table.rows });
      } else if (table.words) {
        currentSection().items.push({ type: 'word', word: cells[0], ipa: cells[1], say: cells[2], es: cells[3] });
      } else {
        table.rows.push(cells);
      }
    } else if (line.startsWith('# ')) {
      doc.title = line.slice(2).trim();
    } else if (line.startsWith('## ')) {
      epigraph = { title: line.slice(3).trim(), notes: [], sections: [] };
      doc.epigraphs.push(epigraph);
      section = null;
      lastItem = null;
      paragraphLang = null;
    } else if (line.startsWith('### ')) {
      section = { title: line.slice(4).trim(), items: [] };
      currentEpigraph().sections.push(section);
      lastItem = null;
      paragraphLang = null;
    } else if (line.startsWith('> ')) {
      addNote(line.slice(2).trim());
    } else if (PARAGRAPH_LABEL_RE.test(line)) {
      paragraphLang = line.match(PARAGRAPH_LABEL_RE)[1] === 'English' ? 'en' : 'es';
    } else if (ITEM_RE.test(line)) {
      const [, indent, tense, en, es] = line.match(ITEM_RE);
      if (indent.length === 0) {
        lastItem = { type: 'item', en, es, children: [] };
        currentSection().items.push(lastItem);
      } else if (lastItem) {
        lastItem.children.push({ tense: tense || '', en, es });
      }
    } else if (paragraphLang) {
      currentSection().items.push({ type: 'para', lang: paragraphLang, text: line.trim() });
      paragraphLang = null;
      lastItem = null;
    } else if (section) {
      section.items.push({ type: 'text', text: line.trim() });
    } else {
      addNote(line.trim());
    }
  }
  return doc;
}

/** Splits text into sentences so long paragraphs are spoken in short pieces (browsers cut long utterances). */
function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]*\s*/g) || [text];
}

/** Removes markdown symbols and turns `[placeholder]` into plain words before speaking. */
function cleanForSpeech(text) {
  return text
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\.{2,}/g, '')
    .replace(/[*_`✱✚]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escapes HTML and applies the only inline markdown used in the notes (bold and code). */
function inlineMarkdown(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
}

function initPage() {
  // without speech support the page still renders; playing shows a message
  const synth = window.speechSynthesis || {
    getVoices: () => [], cancel() {}, speak() {}, pause() {}, resume() {}, paused: false, speaking: false,
  };
  const $ = (id) => document.getElementById(id);
  const main = $('main');
  const tabsEl = $('tabs');
  const docsEl = $('docs');
  const voiceSelect = $('voice');
  const rateInput = $('rate');
  const rateValue = $('rateValue');
  const statusEl = $('status');
  const pauseBtn = $('pause');
  const searchInput = $('search');
  const jumpSelect = $('jump');
  const messageEl = $('message');
  // vocabulary-page controls (absent on the other pages)
  const repeatSelect = $('repeat');
  const gapInput = $('gap');
  const gapValue = $('gapValue');

  const docs = new Map();
  let activeName = null;
  let voices = [];
  let token = 0;
  let marked = null;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const settings = (() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch {
      return {};
    }
  })();
  const saveSettings = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage can be blocked; the page works without it */
    }
  };

  // ---- Speech ----------------------------------------------------------

  function loadVoices() {
    const english = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
    const score = (v) => (/natural|neural/i.test(v.name) ? 0 : /google|microsoft/i.test(v.name) ? 1 : 2) + (v.lang === 'en-US' ? 0 : 0.5);
    voices = english.sort((a, b) => score(a) - score(b));
    voiceSelect.replaceChildren(
      ...voices.map((v, i) => Object.assign(el('option'), { value: i, textContent: `${v.name} (${v.lang})` }))
    );
    const saved = voices.findIndex((v) => v.name === settings.voice);
    if (saved >= 0) voiceSelect.value = String(saved);
  }

  function mark(node) {
    if (marked) marked.classList.remove('speaking');
    marked = node;
    if (node) {
      node.classList.add('speaking');
      node.scrollIntoView({ block: 'nearest' });
    }
  }

  function stop() {
    token++;
    synth.cancel();
    mark(null);
    pauseBtn.textContent = 'Pause';
    statusEl.textContent = '';
  }

  /** Speaks the entries one after another; `entries` are `{ node, text }`. */
  function play(entries) {
    stop();
    if (!voices.length) {
      statusEl.textContent = 'No English voice found in this browser.';
      return;
    }
    const current = token;
    const repeat = repeatSelect ? Number(repeatSelect.value) : 1;
    const gap = gapInput ? Number(gapInput.value) * 1000 : 0;
    const queue = entries.flatMap((entry) => Array.from({ length: repeat }, () => entry));
    let index = 0;
    const next = () => {
      if (current !== token) return;
      if (index >= queue.length) {
        stop();
        return;
      }
      const { node, text } = queue[index++];
      mark(node);
      const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
      utterance.voice = voices[Number(voiceSelect.value)] || voices[0];
      utterance.rate = Number(rateInput.value);
      // the pause between repetitions leaves time to say the word out loud
      utterance.onend = () => {
        if (current !== token) return;
        if (gap && index < queue.length) setTimeout(next, gap);
        else next();
      };
      utterance.onerror = (event) => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') next();
      };
      synth.speak(utterance);
    };
    statusEl.textContent = 'Playing…';
    next();
  }

  function togglePause() {
    if (synth.paused) {
      synth.resume();
      pauseBtn.textContent = 'Pause';
      statusEl.textContent = 'Playing…';
    } else if (synth.speaking) {
      synth.pause();
      pauseBtn.textContent = 'Resume';
      statusEl.textContent = 'Paused';
    }
  }

  // ---- Rendering -------------------------------------------------------

  function playButton(getEntries, label) {
    const btn = el('button', 'play', '▶');
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.addEventListener('click', () => play(getEntries()));
    return btn;
  }

  function lineRow(entry, tense) {
    const row = el('div', 'row');
    const text = el('div', 'text');
    if (tense) text.append(el('span', 'tense', tense));
    const en = el('span', 'en', entry.en);
    en.lang = 'en';
    text.append(en, el('span', 'es', entry.es));
    row.append(playButton(() => [{ node: row, text: entry.en }], `Listen: ${entry.en}`), text);
    return row;
  }

  function itemEntries(item, itemRow, childRows) {
    const entries = [{ node: itemRow, text: item.en }];
    if (!main.classList.contains('hide-tenses')) {
      item.children.forEach((child, i) => entries.push({ node: childRows[i], text: child.en }));
    }
    return entries;
  }

  function renderItem(item, sectionEntries) {
    if (item.type === 'text') {
      const p = el('p', 'note');
      p.innerHTML = inlineMarkdown(item.text);
      return p;
    }

    if (item.type === 'table') {
      const table = el('table', 'legend');
      const head = el('tr');
      item.header.forEach((cell) => {
        const th = el('th');
        th.innerHTML = inlineMarkdown(cell);
        head.append(th);
      });
      table.append(head);
      item.rows.forEach((cells) => {
        const tr = el('tr');
        cells.forEach((cell) => {
          const td = el('td');
          td.innerHTML = inlineMarkdown(cell);
          tr.append(td);
        });
        table.append(tr);
      });
      return table;
    }

    if (item.type === 'word') {
      const li = el('li', 'item');
      li.dataset.q = [item.word, item.ipa, item.say, item.es].join(' ').toLowerCase();
      const row = el('div', 'row word-row');
      const text = el('div', 'text');
      const word = el('span', 'en word', item.word);
      word.lang = 'en';
      text.append(word, el('span', 'ipa', item.ipa), el('span', 'say', item.say), el('span', 'es', item.es));
      const entries = () => [{ node: row, text: item.word }];
      row.append(playButton(entries, `Listen: ${item.word}`), text);
      li.append(row);
      sectionEntries.push(entries);
      return li;
    }

    if (item.type === 'para') {
      const box = el('div', `para ${item.lang}`);
      box.dataset.q = item.text.toLowerCase();
      if (item.lang === 'en') {
        const spans = splitSentences(item.text).map((s) => {
          const span = el('span', 'sentence', s);
          span.lang = 'en';
          return span;
        });
        const entries = () => spans.map((span) => ({ node: span, text: span.textContent }));
        box.append(playButton(entries, 'Listen to this paragraph'), el('p', 'para-text'));
        box.querySelector('.para-text').append(...spans);
        sectionEntries.push(() => entries());
      } else {
        box.append(el('p', 'para-text es', item.text));
      }
      return box;
    }

    const li = el('li', 'item');
    li.dataset.q = [item.en, item.es, ...item.children.flatMap((c) => [c.en, c.es])].join(' ').toLowerCase();
    const row = lineRow(item);
    li.append(row);
    const childRows = [];
    if (item.children.length) {
      const ul = el('ul', 'tenses');
      item.children.forEach((child) => {
        const childLi = el('li');
        const childRow = lineRow(child, child.tense);
        childRows.push(childRow);
        childLi.append(childRow);
        ul.append(childLi);
      });
      li.append(ul);
    }
    sectionEntries.push(() => itemEntries(item, row, childRows));
    return li;
  }

  function renderDoc(name, data) {
    const root = el('div', 'doc');
    root.hidden = true;
    root.append(el('h1', '', data.title || name));
    data.notes.forEach((note) => {
      const p = el('p', 'note');
      p.innerHTML = inlineMarkdown(note);
      root.append(p);
    });

    const epigraphs = data.epigraphs.map((ep) => {
      const details = el('details', 'epigraph');
      details.append(el('summary', '', ep.title));
      ep.notes.forEach((note) => {
        const p = el('p', 'note');
        p.innerHTML = inlineMarkdown(note);
        details.append(p);
      });
      ep.sections.forEach((sec) => {
        const wrap = el('section', 'sec');
        const entryGetters = [];
        const list = el('ul', 'items');
        sec.items.forEach((item) => {
          const node = renderItem(item, entryGetters);
          if (node.tagName === 'LI') list.append(node);
          else wrap.append(node);
        });
        const intro = (sec.notes || []).map((note) => {
          const p = el('p', 'note');
          p.innerHTML = inlineMarkdown(note);
          return p;
        });
        if (sec.title) {
          const head = el('div', 'sec-head');
          head.append(el('h3', '', sec.title));
          head.append(playButton(() => entryGetters.flatMap((get) => get()), `Listen to the whole section: ${sec.title}`));
          wrap.prepend(head, ...intro);
        } else if (intro.length) {
          wrap.prepend(...intro);
        }
        if (list.children.length) wrap.append(list);
        details.append(wrap);
      });
      return { title: ep.title, details };
    });
    epigraphs.forEach(({ details }) => root.append(details));
    docsEl.append(root);
    return { root, epigraphs };
  }

  function showDoc(name) {
    stop();
    activeName = name;
    settings.tab = name;
    saveSettings();
    docs.forEach((doc, key) => {
      doc.root.hidden = key !== name;
      doc.tab.setAttribute('aria-selected', String(key === name));
    });
    const doc = docs.get(name);
    jumpSelect.replaceChildren(
      Object.assign(el('option'), { value: '', textContent: 'Jump to…' }),
      ...doc.epigraphs.map((ep, i) => Object.assign(el('option'), { value: i, textContent: ep.title }))
    );
    applyFilter();
  }

  function addDoc(name, markdown) {
    const previous = docs.get(name);
    if (previous) {
      previous.root.remove();
      previous.tab.remove();
    }
    const { root, epigraphs } = renderDoc(name, parseMarkdown(markdown));
    const tab = el('button', 'tab', name.replace(/\.md$/i, '').replace(/_/g, ' '));
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.addEventListener('click', () => showDoc(name));
    tabsEl.append(tab);
    docs.set(name, { root, epigraphs, tab });
    if (!activeName || settings.tab === name) showDoc(name);
  }

  function applyFilter() {
    const doc = docs.get(activeName);
    if (!doc) return;
    const query = searchInput.value.trim().toLowerCase();
    doc.root.querySelectorAll('li.item, div.para').forEach((node) => {
      node.hidden = Boolean(query) && !node.dataset.q.includes(query);
    });
    doc.root.querySelectorAll('section.sec').forEach((sec) => {
      const nodes = sec.querySelectorAll('li.item, div.para');
      sec.hidden = Boolean(query) && ![...nodes].some((n) => !n.hidden);
    });
    doc.epigraphs.forEach(({ details }) => {
      const sections = details.querySelectorAll('section.sec');
      const visible = [...sections].some((s) => !s.hidden);
      details.hidden = Boolean(query) && !visible;
      if (query && visible) details.open = true;
    });
  }

  // ---- Controls --------------------------------------------------------

  function bindToggle(id, className, key) {
    const input = $(id);
    if (!input) return;
    const apply = () => main.classList.toggle(className, !input.checked);
    if (key in settings) input.checked = Boolean(settings[key]);
    input.addEventListener('change', () => {
      settings[key] = input.checked;
      saveSettings();
      apply();
    });
    apply();
  }

  bindToggle('showSpanish', 'hide-es', 'showSpanish');
  bindToggle('showTenses', 'hide-tenses', 'showTenses');
  bindToggle('showIpa', 'hide-ipa', 'showIpa');
  bindToggle('showSay', 'hide-say', 'showSay');

  if (repeatSelect) {
    if (settings.repeat) repeatSelect.value = settings.repeat;
    repeatSelect.addEventListener('change', () => {
      settings.repeat = repeatSelect.value;
      saveSettings();
    });
  }
  if (gapInput) {
    if (settings.gap) gapInput.value = settings.gap;
    const showGap = () => (gapValue.textContent = `${Number(gapInput.value).toFixed(1)} s`);
    showGap();
    gapInput.addEventListener('input', () => {
      settings.gap = gapInput.value;
      showGap();
      saveSettings();
    });
  }

  if (settings.rate) rateInput.value = settings.rate;
  rateValue.textContent = `${Number(rateInput.value).toFixed(1)}×`;
  rateInput.addEventListener('input', () => {
    settings.rate = rateInput.value;
    rateValue.textContent = `${Number(rateInput.value).toFixed(1)}×`;
    saveSettings();
  });
  voiceSelect.addEventListener('change', () => {
    settings.voice = (voices[Number(voiceSelect.value)] || {}).name;
    saveSettings();
  });
  pauseBtn.addEventListener('click', togglePause);
  $('stop').addEventListener('click', stop);
  searchInput.addEventListener('input', applyFilter);
  jumpSelect.addEventListener('change', () => {
    const doc = docs.get(activeName);
    const target = doc && doc.epigraphs[Number(jumpSelect.value)];
    if (target) {
      target.details.hidden = false;
      target.details.open = true;
      target.details.scrollIntoView({ block: 'start' });
    }
    jumpSelect.value = '';
  });
  $('collapse').addEventListener('click', () => {
    const doc = docs.get(activeName);
    if (doc) doc.epigraphs.forEach(({ details }) => (details.open = false));
  });
  $('files').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      addDoc(file.name, await file.text());
    }
    messageEl.hidden = docs.size > 0;
  });

  synth.onvoiceschanged = loadVoices;
  loadVoices();

  // ---- Initial load ----------------------------------------------------

  const requested = (main.dataset.docs || '').split(',').map((name) => name.trim()).filter(Boolean);
  const files = requested.length ? requested : DOC_FILES;
  tabsEl.hidden = files.length === 1;

  Promise.allSettled(
    files.map((name) =>
      fetch(name).then((response) => {
        if (!response.ok) throw new Error(name);
        return response.text().then((text) => ({ name, text }));
      })
    )
  ).then((results) => {
    results.forEach((result) => {
      if (result.status === 'fulfilled') addDoc(result.value.name, result.value.text);
    });
    messageEl.hidden = docs.size > 0;
  });
}

if (typeof document !== 'undefined') initPage();
if (typeof module !== 'undefined') module.exports = { parseMarkdown, splitSentences, cleanForSpeech, inlineMarkdown };
