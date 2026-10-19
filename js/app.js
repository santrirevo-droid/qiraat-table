(function () {
  'use strict';

  const QURRA = [
    { id: 'nafi',     name: 'نافع',       ruwat: [['qa', 'قالون'], ['wr', 'ورش']] },
    { id: 'kathir',   name: 'ابن كثير',   ruwat: [['bz', 'البزّي'], ['qn', 'قنبل']] },
    { id: 'abuamr',   name: 'أبو عمرو',   ruwat: [['da', 'الدوري'], ['su', 'السوسي']] },
    { id: 'ibnamir',  name: 'ابن عامر',   ruwat: [['hi', 'هشام'], ['dh', 'ابن ذكوان']] },
    { id: 'asim',     name: 'عاصم',       ruwat: [['sh', 'شعبة'], ['hf', 'حفص']] },
    { id: 'hamzah',   name: 'حمزة',       ruwat: [['kh', 'خلف'], ['kd', 'خلّاد']] },
    { id: 'kisai',    name: 'الكسائي',    ruwat: [['ah', 'أبو الحارث'], ['dk', 'الدوري']] },
    { id: 'abujafar', name: 'أبو جعفر',   ruwat: [['iw', 'ابن وردان'], ['ij', 'ابن جمّاز']] },
    { id: 'yaqub',    name: 'يعقوب',      ruwat: [['rw', 'رويس'], ['rh', 'روح']] },
    { id: 'khalaf',   name: 'خلف العاشر', ruwat: [['is', 'إسحاق'], ['id', 'إدريس']] }
  ];
  const CODES = QURRA.flatMap(q => q.ruwat.map(r => r[0]));

  const SURAH_NAMES = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];

  const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const normalize = s => String(s)
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/g, '')
    .replace(/[ٱأإآ]/g, 'ا').replace(/[یى]/g, 'ي').replace(/ک/g, 'ك').replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/\s+/g, ' ');
  // Rasm search ignores letters of madd, which the Uthmani rasm often omits (إبرهم ~ إبراهيم).
  const skeleton = s => normalize(s).replace(/[اويى]/g, '');

  /* ---------- Data resolution ---------- */

  // marks[code]: 'on' | 'khulf' ; prefer[code] = true when this variant is the رواية الإثبات for a khulf
  function resolveItem(surah, item, order) {
    const mentioned = new Set();
    const variants = item.v.map(([text, spec, note]) => {
      const marks = {}, prefer = {};
      let rest = false;
      spec.trim().split(/\s+/).forEach(tok => {
        if (tok === '*') { rest = true; return; }
        const khulf = tok.startsWith('~');
        const pref = tok.endsWith('!');
        const code = tok.replace(/^~/, '').replace(/!$/, '');
        if (!CODES.includes(code)) console.warn('رمز راوٍ غير معروف:', code, surah, item.a);
        marks[code] = khulf ? 'khulf' : 'on';
        if (pref) prefer[code] = true;
        mentioned.add(code);
      });
      return { text, note, marks, prefer, rest };
    });
    const restCodes = CODES.filter(c => !mentioned.has(c));
    variants.forEach(v => { if (v.rest) restCodes.forEach(c => { v.marks[c] = 'on'; }); });

    const covered = new Set(variants.flatMap(v => Object.keys(v.marks)));
    const missing = CODES.filter(c => !covered.has(c));
    if (missing.length) console.warn('رواة بلا قراءة في', surah, item.a, item.h, missing);

    return {
      key: `${surah}:${item.a}:${order}`,
      surah, ayah: item.a, harf: item.h, pos: item.p,
      ref: item.ref || '', verified: !!item.ok, chk: item.chk || '',
      byKhulf: variants,
      byIthbat: applyIthbat(variants),
      rasm: skeleton(item.h),
      readings: normalize(variants.map(v => v.text).join(' '))
    };
  }

  // رواية الإثبات: a rawi with two wujuh is assigned to the variant that affirms the difference —
  // the one marked "!" in the data, otherwise the variant that is not the majority ("*") reading.
  function applyIthbat(variants) {
    const out = variants.map(v => ({ ...v, marks: { ...v.marks } }));
    CODES.forEach(c => {
      const idx = out.map((v, i) => (v.marks[c] === 'khulf' ? i : -1)).filter(i => i >= 0);
      if (!idx.length) return;
      let pick = idx.find(i => out[i].prefer[c]);
      if (pick === undefined) pick = idx.find(i => !out[i].rest);
      if (pick === undefined) pick = idx[0];
      idx.forEach(i => { if (i === pick) out[i].marks[c] = 'on'; else delete out[i].marks[c]; });
    });
    return out;
  }

  const COMPLETE = {};
  const AYAT = {};
  const ITEMS = (window.QIRAAT_SURAHS || [])
    .sort((x, y) => x.surah - y.surah)
    .flatMap(s => {
      COMPLETE[s.surah] = !!s.complete;
      AYAT[s.surah] = s.ayat || {};
      return s.items.map((it, i) => resolveItem(s.surah, it, i));
    })
    .sort((x, y) => x.surah - y.surah || x.ayah - y.ayah || (x.pos ?? 0) - (y.pos ?? 0));
  const BY_KEY = Object.fromEntries(ITEMS.map(it => [it.key, it]));
  const BY_AYAH = {};
  ITEMS.forEach(it => { (BY_AYAH[`${it.surah}:${it.ayah}`] ||= []).push(it); });

  /* ---------- Full ayah text ---------- */

  // Tanzil text keeps waqf signs as separate tokens; only tokens with letters count as words (as in build_data.py).
  const isWord = t => /[ء-غف-يٱ-ۓ]/.test(t);

  // Word indexes of the ayah covered by a position's harf. The harf may start a word or two before
  // the anchor word ({prev} {w}), skip words ("…"), or run into the next ayah, so match it word by word.
  function harfWords(o, words) {
    const hw = String(o.harf).split(/\s+/).filter(w => w && w !== '…').map(normalize);
    const start = [o.pos - 2, o.pos - 1, o.pos].find(i => i >= 0 && words[i] === hw[0]);
    if (start === undefined) return new Set([o.pos]);
    const out = new Set();
    let j = start;
    for (const w of hw) {
      const k = words.indexOf(w, j);
      if (k < 0 || k - j > 6) break;
      out.add(k); j = k + 1;
    }
    return out;
  }

  function ayahHtml(it) {
    const text = (AYAT[it.surah] || {})[it.ayah];
    if (!text) return '';
    const tokens = text.split(' ');
    const words = tokens.filter(isWord).map(normalize);
    const main = it.pos != null ? harfWords(it, words) : new Set();
    const other = new Set((BY_AYAH[`${it.surah}:${it.ayah}`] || [])
      .filter(o => o !== it && o.pos != null).flatMap(o => [...harfWords(o, words)]));
    let n = -1;
    const html = tokens.map(tok => {
      if (!isWord(tok)) return `<span class="ayah-mark">${esc(tok)}</span>`;
      n++;
      if (main.has(n)) return `<mark class="hl-main">${esc(tok)}</mark>`;
      if (other.has(n)) return `<span class="hl-other">${esc(tok)}</span>`;
      return esc(tok);
    }).join(' ');
    return `${html} <span class="ayah-end">﴿${toAr(it.ayah)}﴾</span>`;
  }

  /* ---------- State ---------- */

  const STORE_KEY = 'qiraat-table-prefs';
  const PREF_KEYS = ['mode', 'hidden', 'hideEmpty', 'onlyDiff', 'method', 'pageSize', 'searchIn'];
  const state = {
    surah: 'all', from: '', to: '', q: '', searchIn: 'rasm',
    mode: 'ruwat', method: 'ithbat', hidden: [], hideEmpty: true, onlyDiff: false, onlyUnverified: false,
    page: 1, pageSize: 25
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    PREF_KEYS.forEach(k => { if (k in saved) state[k] = saved[k]; });
  } catch (e) { /* storage unavailable */ }
  const savePrefs = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(PREF_KEYS.map(k => [k, state[k]]))));
    } catch (e) { /* storage unavailable */ }
  };

  const visibleQurra = () => QURRA.filter(q => !state.hidden.includes(q.id));
  const visibleCodes = () => visibleQurra().flatMap(q => q.ruwat.map(r => r[0]));
  const variantsOf = it => (state.method === 'ithbat' ? it.byIthbat : it.byKhulf);
  const hasReader = (v, codes) => codes.some(c => v.marks[c]);

  function filteredItems() {
    const codes = visibleCodes();
    const q = normalize(state.q.trim());
    const qRasm = skeleton(state.q.trim());
    const from = parseInt(state.from, 10), to = parseInt(state.to, 10);
    return ITEMS.map(it => {
      if (state.surah !== 'all' && it.surah !== +state.surah) return null;
      if (!isNaN(from) && it.ayah < from) return null;
      if (!isNaN(to) && it.ayah > to) return null;
      if (state.onlyUnverified && it.verified) return null;
      if (q) {
        const hit = it.rasm.includes(qRasm) || (state.searchIn === 'all' && it.readings.includes(q));
        if (!hit && String(it.ayah) !== q) return null;
      }
      const all = variantsOf(it);
      const active = all.filter(v => hasReader(v, codes));
      if (state.onlyDiff && active.length < 2) return null;
      const shown = state.hideEmpty ? active : all;
      return shown.length ? { ...it, shown } : null;
    }).filter(Boolean);
  }

  /* ---------- Text helpers ---------- */

  const ayahLabel = it => `(${toAr(it.surah)}) ${SURAH_NAMES[it.surah - 1]}: ${toAr(it.ayah)}`;

  // Names of who reads a variant: the qari when both ruwat agree, otherwise the rawi.
  function readerNames(v, qurra) {
    const names = [];
    qurra.forEach(q => {
      const [a, b] = q.ruwat.map(r => v.marks[r[0]]);
      if (a === 'on' && b === 'on') { names.push({ text: q.name, qari: true }); return; }
      q.ruwat.forEach(([c, n]) => {
        if (v.marks[c]) names.push({ text: n + (v.marks[c] === 'khulf' ? ' بخلفٍ عنه' : ''), khulf: v.marks[c] === 'khulf' });
      });
    });
    return names;
  }

  const joinAr = arr => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join('، ') + ' و' + arr[arr.length - 1];

  // "قرأ ابن عامر «...»، وقرأ الباقون «...»" — generated from the data, all ten qurra.
  function summarize(variants) {
    const sized = variants.map(v => ({ v, n: Object.keys(v.marks).length })).filter(x => x.n);
    if (!sized.length) return '';
    const majority = sized.reduce((m, x) => (x.n > m.n ? x : m));
    const parts = sized.filter(x => x !== majority)
      .map(x => `قرأ ${joinAr(readerNames(x.v, QURRA).map(r => r.text))} «${x.v.text}»${x.v.note ? ` (${x.v.note})` : ''}`);
    parts.push(`${parts.length ? 'وقرأ الباقون' : 'قرأ الجميع'} «${majority.v.text}»`);
    return parts.join('، ') + '.';
  }

  /* ---------- Rendering ---------- */

  function rawiCell(mark) {
    if (mark === 'on') return '<span class="tick tick-on">✓</span>';
    if (mark === 'khulf') return '<span class="tick tick-khulf" title="بخلفٍ عنه">بخلف</span>';
    return '<span class="tick tick-off">—</span>';
  }

  function qariCell(q, marks) {
    const [a, b] = q.ruwat.map(r => marks[r[0]]);
    if (a === 'on' && b === 'on') return '<span class="tick tick-on">✓</span>';
    if (!a && !b) return '<span class="tick tick-off">—</span>';
    const parts = q.ruwat.filter(r => marks[r[0]])
      .map(([c, n]) => esc(n) + (marks[c] === 'khulf' ? ' <small>بخلف</small>' : ''));
    return `<span class="tick-part">${parts.join('<br>')}</span>`;
  }

  // Machine check levels from data/tahqiq.json; human tahqiq (ok:true in rules) outranks them all.
  const CHECKS = {
    nb: ['مطابق للمصدرين', 'طابق آليًّا نصَّ النشر والبدور الزاهرة'],
    n:  ['مطابق للنشر', 'طابق آليًّا نصَّ النشر'],
    b:  ['مطابق للبدور', 'طابق آليًّا البدور الزاهرة، وكُتب من نص النشر'],
    m:  ['مراجَع على النشر', 'قوبل يدويًّا بنص النشر في الصفحة المحال إليها']
  };
  const checkText = it => it.verified ? 'محقَّق: رُوجع على المصدر'
    : CHECKS[it.chk] ? `${CHECKS[it.chk][1]}، ولم يُحقِّقه قارئ بعد` : 'لم يُراجَع على المصدر بعد';
  const unverifiedBadge = it => {
    if (it.verified) return '<span class="badge-check badge-ok" title="رُوجع على المصدر">محقَّق</span>';
    const c = CHECKS[it.chk];
    return c
      ? `<span class="badge-check badge-${it.chk}" title="${c[1]}، ولم يُحقِّقه قارئ بعد">${c[0]}</span>`
      : '<span class="badge-unverified" title="لم يُراجَع على المصدر بعد">غير محقَّق</span>';
  };

  function renderHead(qurra) {
    const perQari = state.mode === 'ruwat' ? 2 : 1;
    const top = qurra.map(q => `<th colspan="${perQari}" class="qari-start">${esc(q.name)}</th>`).join('');
    const sub = qurra.map(q => state.mode === 'ruwat'
      ? q.ruwat.map(([, n], i) => `<th class="th-rawi${i === 0 ? ' qari-start' : ''}">${esc(n)}</th>`).join('')
      : `<th class="th-rawi qari-start">${q.ruwat.map(r => esc(r[1])).join(' · ')}</th>`
    ).join('');
    return `<tr class="group-row"><th colspan="3" class="sticky-block">موضع الاختلاف</th>${top}</tr>
      <tr class="col-row"><th class="sc sc-1">الآية</th><th class="sc sc-2">الحرف</th><th class="sc sc-3">القراءة</th>${sub}</tr>`;
  }

  function renderBody(items, qurra) {
    return items.map((it, idx) => {
      const zebra = idx % 2 ? 'row-even' : 'row-odd';
      const n = it.shown.length;
      return it.shown.map((v, i) => {
        const lead = i === 0
          ? `<td class="cell-ayah sc sc-1" rowspan="${n}" data-tip="${it.key}">${ayahLabel(it)}${unverifiedBadge(it)}</td>
             <td class="cell-harf sc sc-2" rowspan="${n}"><button type="button" class="harf-btn" data-key="${it.key}" data-tip="${it.key}">${esc(it.harf)}</button></td>`
          : '';
        const cells = qurra.map(q => state.mode === 'ruwat'
          ? q.ruwat.map(([c], j) => `<td class="cell-tick${j === 0 ? ' qari-start' : ''}">${rawiCell(v.marks[c])}</td>`).join('')
          : `<td class="cell-tick qari-start">${qariCell(q, v.marks)}</td>`
        ).join('');
        const note = v.note ? `<span class="variant-note">${esc(v.note)}</span>` : '';
        return `<tr class="${zebra} ${i === 0 ? 'block-first' : 'block-cont'}">${lead}<td class="cell-qiraat sc sc-3">${esc(v.text)}${note}</td>${cells}</tr>`;
      }).join('');
    }).join('');
  }

  function chipsHtml(v, qurra) {
    const names = readerNames(v, qurra);
    if (!names.length) return '<span class="chip chip-none">لا أحد من المعروضين</span>';
    return names.map(r => `<span class="chip${r.qari ? ' chip-qari' : ''}${r.khulf ? ' chip-khulf' : ''}">${esc(r.text)}</span>`).join('');
  }

  function renderCards(items, qurra) {
    return items.map(it => `
      <div class="ayah-group">
        <button type="button" class="ayah-group-head harf-btn" data-key="${it.key}">
          <span class="ayah-tag">${ayahLabel(it)}${unverifiedBadge(it)}</span><span class="harf-tag">${esc(it.harf)}</span>
        </button>
        <div class="variant-list">${it.shown.map(v => `
          <div class="variant-card">
            <div class="variant-text">${esc(v.text)}${v.note ? `<span class="variant-note">${esc(v.note)}</span>` : ''}</div>
            <div class="chips">${chipsHtml(v, qurra)}</div>
          </div>`).join('')}
        </div>
      </div>`).join('');
  }

  const $ = id => document.getElementById(id);

  function renderPager(total) {
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = total ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = Math.min(total, state.page * state.pageSize);
    const label = `الصفحة ${toAr(state.page)} من ${toAr(pages)} · المواضع ${toAr(start)}–${toAr(end)} من ${toAr(total)}`;
    document.querySelectorAll('.pager-label').forEach(el => { el.textContent = label; });
    document.querySelectorAll('[data-page="prev"]').forEach(b => { b.disabled = state.page <= 1; });
    document.querySelectorAll('[data-page="next"]').forEach(b => { b.disabled = state.page >= pages; });
    $('f-goto').max = pages;
    return pages;
  }

  function render() {
    const qurra = visibleQurra();
    const items = filteredItems();
    renderPager(items.length);
    const pageItems = items.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);

    $('thead').innerHTML = renderHead(qurra);
    $('tbody').innerHTML = renderBody(pageItems, qurra);
    $('cards').innerHTML = renderCards(pageItems, qurra);
    $('empty').hidden = items.length > 0;
    $('table-wrap').hidden = items.length === 0;
    $('stat-positions').textContent = toAr(items.length);
    $('stat-variants').textContent = toAr(items.reduce((s, it) => s + it.shown.length, 0));
    $('stat-unverified').textContent = toAr(items.filter(it => !it.verified).length);
    const partial = state.surah === 'all'
      ? Object.keys(COMPLETE).filter(k => !COMPLETE[k]).length > 0
      : !COMPLETE[state.surah];
    $('coverage').hidden = !partial;
    $('coverage').textContent = state.surah === 'all'
      ? `السور المكتملة: ${Object.keys(COMPLETE).filter(k => COMPLETE[k]).map(k => SURAH_NAMES[k - 1]).join('، ')}. ما سواها فيه المواضع الداخلة في القواعد العامة فقط حتى يُفرَغ من فرشها.`
      : `فرش سورة ${SURAH_NAMES[state.surah - 1]} لم يُفرَغ منه بعد؛ المعروض المواضع الداخلة في القواعد العامة المذكورة في سور سابقة فقط.`;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
    document.querySelectorAll('[data-method]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.method === state.method)));
    document.querySelectorAll('[data-qari]').forEach(b => b.setAttribute('aria-pressed', String(!state.hidden.includes(b.dataset.qari))));
  }

  /* ---------- Detail dialog ---------- */

  function openDetail(key) {
    const it = BY_KEY[key];
    if (!it) return;
    const variants = variantsOf(it);
    const khulfNote = state.method === 'ithbat' && it.byKhulf.some(v => Object.values(v.marks).includes('khulf'))
      ? `<p class="dlg-note">في هذا الموضع خلافٌ عن بعض الرواة؛ المعروض رواية الإثبات. للاطلاع على الوجهين اختر «إظهار الخلف».</p>`
      : '';
    $('dlg-title').textContent = ayahLabel(it);
    const ayah = ayahHtml(it);
    $('dlg-body').innerHTML = `
      <div class="dlg-harf">${esc(it.harf)}</div>
      ${ayah ? `<p class="ayah-full">${ayah}</p>` : ''}
      <p class="dlg-summary">${esc(summarize(variants))}</p>
      ${khulfNote}
      <div class="dlg-variants">${variants.filter(v => Object.keys(v.marks).length).map(v => `
        <div class="dlg-variant">
          <div class="variant-text">${esc(v.text)}${v.note ? `<span class="variant-note">${esc(v.note)}</span>` : ''}</div>
          <div class="chips">${chipsHtml(v, QURRA)}</div>
        </div>`).join('')}
      </div>
      <h3>المرجع</h3>
      <p class="dlg-ref">${it.ref ? esc(it.ref) : 'لم يُضَف المرجع لهذا الموضع بعد.'}</p>
      <p class="dlg-status ${it.verified ? 'ok' : ''}">${esc(checkText(it))}</p>`;
    const dlg = $('detail');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  /* ---------- Hover card ---------- */

  function tipHtml(it) {
    const variants = variantsOf(it).filter(v => Object.keys(v.marks).length);
    const others = (BY_AYAH[`${it.surah}:${it.ayah}`] || []).filter(o => o !== it);
    const hasKhulf = it.byKhulf.some(v => Object.values(v.marks).includes('khulf'));
    return `
      <div class="tip-head"><span>${ayahLabel(it)}</span>${unverifiedBadge(it)}</div>
      <p class="ayah-full">${ayahHtml(it) || esc(it.harf)}</p>
      <div class="tip-sec">
        <div class="tip-label">موضع الاختلاف: <b class="tip-harf">${esc(it.harf)}</b></div>
        <p class="tip-summary">${esc(summarize(variants))}</p>
        ${hasKhulf ? `<p class="tip-note">فيه خلافٌ عن بعض الرواة${state.method === 'ithbat' ? '؛ المعروض رواية الإثبات' : ''}.</p>` : ''}
      </div>
      ${others.length ? `<div class="tip-sec"><div class="tip-label">مواضع أخرى في الآية (${toAr(others.length)})</div>
        <div class="tip-others">${others.map(o => `<span class="tip-chip">${esc(o.harf)}</span>`).join('')}</div></div>` : ''}
      <div class="tip-foot"><span>${it.ref ? esc(it.ref) : 'بلا مرجع بعد'}<br>${esc(checkText(it))}</span><span class="tip-hint">انقر للتفصيل</span></div>`;
  }

  function initTip() {
    const tip = $('tip');
    let timer = null, current = null;
    const hide = () => { clearTimeout(timer); current = null; tip.hidden = true; };
    const place = el => {
      const r = el.getBoundingClientRect(), pad = 12;
      tip.style.left = '0px'; tip.style.top = '0px';
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let left = r.left + r.width / 2 - w / 2;
      left = Math.min(Math.max(pad, left), window.innerWidth - w - pad);
      let top = r.bottom + 8;
      if (top + h > window.innerHeight - pad) top = Math.max(pad, r.top - h - 8);
      tip.style.left = `${left}px`; tip.style.top = `${top}px`;
    };
    const show = el => {
      const it = BY_KEY[el.dataset.tip];
      if (!it) return;
      current = el;
      tip.innerHTML = tipHtml(it);
      tip.hidden = false;
      place(el);
    };
    document.addEventListener('pointerover', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = e.target.closest('[data-tip]');
      if (!el || el === current) return;
      clearTimeout(timer);
      timer = setTimeout(() => show(el), 180);
    });
    document.addEventListener('pointerout', e => {
      const el = e.target.closest('[data-tip]');
      if (el && !el.contains(e.relatedTarget)) hide();
    });
    document.addEventListener('focusin', e => {
      const el = e.target.closest('[data-tip]');
      if (el && el.matches(':focus-visible')) show(el); else hide();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    document.addEventListener('click', hide);
    window.addEventListener('scroll', hide, { passive: true, capture: true });
  }

  /* ---------- Controls ---------- */

  function initControls() {
    const surahs = [...new Set(ITEMS.map(it => it.surah))];
    $('f-surah').innerHTML = '<option value="all">جميع السور</option>' +
      surahs.map(s => `<option value="${s}">${toAr(s)} — ${SURAH_NAMES[s - 1]}${COMPLETE[s] ? '' : ' (جزئي)'}</option>`).join('');

    $('qari-toggles').innerHTML = QURRA.map(q =>
      `<button type="button" class="toggle" data-qari="${q.id}" title="${q.ruwat.map(r => r[1]).join(' و')}">${esc(q.name)}</button>`
    ).join('');

    const reset = () => { state.page = 1; };
    $('f-surah').addEventListener('change', e => { state.surah = e.target.value; reset(); render(); });
    $('f-from').addEventListener('input', e => { state.from = e.target.value; reset(); render(); });
    $('f-to').addEventListener('input', e => { state.to = e.target.value; reset(); render(); });
    $('f-search').addEventListener('input', e => { state.q = e.target.value; reset(); render(); });
    $('f-search-in').value = state.searchIn;
    $('f-search-in').addEventListener('change', e => { state.searchIn = e.target.value; reset(); savePrefs(); render(); });

    $('f-page-size').value = String(state.pageSize);
    $('f-page-size').addEventListener('change', e => { state.pageSize = +e.target.value; reset(); savePrefs(); render(); });
    document.addEventListener('click', e => {
      const p = e.target.closest('[data-page]');
      if (!p) return;
      state.page += p.dataset.page === 'next' ? 1 : -1;
      render();
      $('controls').scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    $('goto-form').addEventListener('submit', e => {
      e.preventDefault();
      const n = parseInt($('f-goto').value, 10);
      if (!isNaN(n)) { state.page = n; render(); }
    });

    [['f-hide-empty', 'hideEmpty', true], ['f-only-diff', 'onlyDiff', true], ['f-only-unverified', 'onlyUnverified', false]]
      .forEach(([id, key, persist]) => {
        $(id).checked = state[key];
        $(id).addEventListener('change', e => { state[key] = e.target.checked; reset(); if (persist) savePrefs(); render(); });
      });

    document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      state.mode = b.dataset.mode; savePrefs(); render();
    }));
    document.querySelectorAll('[data-method]').forEach(b => b.addEventListener('click', () => {
      state.method = b.dataset.method; savePrefs(); render();
    }));
    $('qari-toggles').addEventListener('click', e => {
      const b = e.target.closest('[data-qari]');
      if (!b) return;
      const id = b.dataset.qari;
      state.hidden = state.hidden.includes(id) ? state.hidden.filter(x => x !== id) : [...state.hidden, id];
      reset(); savePrefs(); render();
    });
    $('q-all').addEventListener('click', () => { state.hidden = []; reset(); savePrefs(); render(); });
    $('q-none').addEventListener('click', () => { state.hidden = QURRA.map(q => q.id); reset(); savePrefs(); render(); });

    document.addEventListener('click', e => {
      const b = e.target.closest('.harf-btn');
      if (b) openDetail(b.dataset.key);
    });
    $('dlg-close').addEventListener('click', () => $('detail').close());
    $('detail').addEventListener('click', e => { if (e.target === $('detail')) $('detail').close(); });

  }

  initControls();
  initTip();
  render();
})();
