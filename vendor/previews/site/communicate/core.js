'use strict';
// Local integration change: optional DOM mounting and reusable memory-only policy engine.
(() => {
const $ = (id) => globalThis.document?.getElementById(id);
const mode = globalThis.document?.documentElement.dataset.mode || 'communicate';
const mounted = mode === 'communicate' && !!$('zero-map');
if (mounted) document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
const palette = () => {
  const s = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    ['bg', 'grid', 'accent', 'ink', 'muted', 'amber', 'panel'].map((k) => [
      k,
      s.getPropertyValue('--' + k).trim(),
    ]),
  );
};
function download(name, data) {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object')
    return (
      '{' +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical(v[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(v);
}
async function digest(v) {
  if (!globalThis.crypto?.subtle)
    throw Error('Hashing needs a secure browser context. Use the hosted preview or localhost.');
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(v)));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
}
function createMap() {
  const c = $('zero-map'),
    g = c.getContext('2d');
  let w = 1,
    h = 1,
    phase = 0;
  const selected = $('map-focus');
  const draw = () => {
    const p = palette(),
      small = w < 550;
    g.clearRect(0, 0, w, h);
    g.fillStyle = p.bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = p.grid;
    g.globalAlpha = 0.4;
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    const cx = w * 0.5,
      cy = h * 0.5,
      r = small ? 37 : 48;
    const nodes = [
      { x: w * 0.17, y: cy, label: 'InvariantTap', id: 'tap' },
      { x: w * 0.83, y: cy, label: 'Invariant Surface', id: 'surface' },
      { x: cx, y: 45, label: 'AGI Science', id: 'science' },
      { x: cx, y: h - 45, label: 'AGI Communicate', id: 'communicate' },
    ];
    g.font = `${small ? 12 : 14}px Satoshi, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    nodes.forEach((n) => {
      g.strokeStyle = selected?.value === n.id || n.id === mode ? p.amber : p.accent;
      g.lineWidth = selected?.value === n.id ? 2.5 : 1.4;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(n.x, n.y);
      g.stroke();
      const bw = small ? (n.id === 'surface' ? 104 : n.id === 'communicate' ? 110 : 90) : 144;
      g.fillStyle = p.panel;
      g.fillRect(n.x - bw / 2, n.y - 18, bw, 36);
      g.strokeRect(n.x - bw / 2, n.y - 18, bw, 36);
      g.fillStyle = p.ink;
      g.fillText(n.label, n.x, n.y);
    });
    for (let k = 0; k < 3; k++) {
      g.strokeStyle = p.accent;
      g.globalAlpha = 0.5 - k * 0.1;
      g.beginPath();
      g.ellipse(cx, cy, r + 17 + k * 13, r + 8 + k * 13, 0.25 + phase, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = p.panel;
    g.strokeStyle = p.accent;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = p.ink;
    g.font = `bold ${small ? 12 : 16}px Satoshi, sans-serif`;
    g.fillText('SCANDOC', cx, cy - 9);
    g.fillText('ZERO', cx, cy + 11);
    g.fillStyle = p.muted;
    g.font = '12px Satoshi, sans-serif';
    g.fillText('Topology junction', cx, cy + r + 33);
  };
  const resize = () => {
    const b = c.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 2);
    w = b.width;
    h = b.height;
    c.width = Math.round(w * d);
    c.height = Math.round(h * d);
    g.setTransform(d, 0, 0, d, 0, 0);
    draw();
  };
  new ResizeObserver(resize).observe(c);
  selected?.addEventListener('change', () => {
    phase += 0.15;
    draw();
    $('focus-status').textContent =
      selected.options[selected.selectedIndex].text + ' relation selected';
  });
  window.drawZero = draw;
  draw();
}
if (mounted) {
$('theme').onclick = () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  window.drawZero?.();
  window.drawExperiment?.();
};
createMap();
}
const basePoints = [
  [0, 0],
  [1, 0],
  [1, 0.75],
  [0, 0.75],
];
function transformPoints(kind, a) {
  return basePoints.map(([x, y]) =>
    kind === 'translation'
      ? [x + a, y + a * 0.4]
      : kind === 'rotation'
        ? [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
        : [x + a * y, y],
  );
}
function residual(points) {
  let e = 0;
  for (let i = 0; i < basePoints.length; i++)
    for (let j = i + 1; j < basePoints.length; j++) {
      const d = (p) => Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]);
      e = Math.max(e, Math.abs(d(points) - d(basePoints)));
    }
  return e;
}
function science() {
  let journal = [],
    last = null,
    seq = 0;
  const experiment = $('experiment-map'),
    g = experiment.getContext('2d');
  let w = 1,
    h = 1;
  window.drawExperiment = () => {
    const p = palette(),
      kind = $('transformation').value,
      a = Number($('amount').value) / 100;
    const transformed = transformPoints(kind, a);
    g.clearRect(0, 0, w, h);
    g.fillStyle = p.bg;
    g.fillRect(0, 0, w, h);
    const scale = Math.min(w * 0.21, h * 0.35),
      ox = w * 0.38,
      oy = h * 0.61;
    const poly = (points, col, dash) => {
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.setLineDash(dash);
      g.beginPath();
      points.forEach(([x, y], i) => {
        if (i) g.lineTo(ox + x * scale, oy - y * scale);
        else g.moveTo(ox + x * scale, oy - y * scale);
      });
      g.closePath();
      g.stroke();
      g.setLineDash([]);
      points.forEach(([x, y]) => {
        g.fillStyle = col;
        g.beginPath();
        g.arc(ox + x * scale, oy - y * scale, 4, 0, Math.PI * 2);
        g.fill();
      });
    };
    poly(basePoints, p.accent, [5, 5]);
    poly(transformed, p.amber, []);
  };
  const resize = () => {
    const b = experiment.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 2);
    w = b.width;
    h = b.height;
    experiment.width = Math.round(w * d);
    experiment.height = Math.round(h * d);
    g.setTransform(d, 0, 0, d, 0, 0);
    window.drawExperiment();
  };
  new ResizeObserver(resize).observe(experiment);
  function update() {
    $('amount-value').textContent = (Number($('amount').value) / 100).toFixed(2);
    last = null;
    $('add-observation').disabled = !$('note').value.trim();
    $('test-status').dataset.state = '';
    $('test-title').textContent = 'Ready to compare';
    $('test-detail').textContent =
      'Compare all six pairwise distances in a synthetic four-point field.';
    window.drawExperiment();
  }
  $('transformation').onchange = update;
  $('amount').oninput = update;
  $('compare').onclick = () => {
    const kind = $('transformation').value,
      a = Number($('amount').value) / 100,
      e = residual(transformPoints(kind, a));
    last = {
      id: ++seq,
      kind,
      amount: a,
      max_distance_error: e,
      tolerance: 0.000001,
      preserved: e <= 0.000001,
      dataset: 'synthetic-four-point-rectangle',
      claim: 'metric preservation in this sample only',
      sphere_canonical: false,
    };
    $('test-status').dataset.state = last.preserved ? 'pass' : 'fail';
    $('test-title').textContent = last.preserved
      ? 'Metric relation preserved'
      : 'Metric relation changed';
    $('test-detail').textContent =
      `Max distance change: ${e.toExponential(3)}. Tolerance: 1e-6. ${last.preserved ? 'This sample passes; it is not a general invariant proof.' : 'This sample fails the metric test; connectivity is still unchanged.'}`;
    $('add-observation').disabled = false;
  };
  function renderJournal() {
    $('journal-count').textContent = journal.length + ' observations';
    $('journal-list').replaceChildren();
    if (!journal.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent =
        'Keep a question or an experiment here. Knowledge does not have to earn its place.';
      $('journal-list').append(p);
    }
    journal
      .slice()
      .reverse()
      .forEach((e) => {
        const article = document.createElement('article');
        article.className = 'journal-item';
        const title = document.createElement('strong');
        title.textContent = e.title;
        const small = document.createElement('small');
        small.textContent = e.experiment
          ? e.experiment.kind +
            ' · ' +
            (e.experiment.preserved ? 'sample preserved' : 'sample changed')
          : 'Research question · not a result';
        const note = document.createElement('p');
        note.textContent = e.note;
        article.append(title, small, note);
        $('journal-list').append(article);
      });
    $('export').disabled = !journal.length;
    $('clear').disabled = !journal.length;
  }
  $('add-observation').onclick = () => {
    const note = $('note').value.trim();
    if (!last && !note) {
      $('note-status').textContent = 'Write a question or run a comparison first.';
      return;
    }
    if (journal.length >= 64) {
      $('note-status').textContent =
        'This local notebook holds 64 observations. Export or clear it first.';
      return;
    }
    journal.push({
      title: last ? `Observation ${journal.length + 1}` : `Question ${journal.length + 1}`,
      note,
      experiment: last ? { ...last } : null,
    });
    $('note').value = '';
    $('note-status').textContent = 'Added to the local notebook. Nothing was uploaded.';
    renderJournal();
  };
  $('note').oninput = () => {
    $('add-observation').disabled = !$('note').value.trim() && !last;
  };
  $('export').onclick = () =>
    download('scandoc-zero-science-notebook.json', {
      mode: 'knowledge-only',
      coupling: 'Scandoc Zero',
      zero_data_boundary:
        'no sensors, identity or raw media captured; typed notes and synthetic descriptors are optional local data',
      observations: journal,
    });
  $('clear').onclick = () => {
    journal = [];
    renderJournal();
    $('note-status').textContent = 'Notebook cleared.';
  };
  renderJournal();
}
function communicate({ mount = false } = {}) {
  const modules = {
    rigid: {
      name: 'Rigid relation module',
      algorithm: 'rotate-four-point-field',
      boundary: 'derived-only',
    },
    shear: {
      name: 'Shear labelled as metric-invariant',
      algorithm: 'shear-four-point-field',
      boundary: 'derived-only',
    },
    leak: {
      name: 'Raw-input boundary violation',
      algorithm: 'rotate-four-point-field',
      boundary: 'requests-raw-media',
    },
  };
  const VERSION = 'communicate-rules-preview-2';
  const initial = () => ({
    wallet: 20,
    held: 0,
    pool: 100,
    pool_reserved: 0,
    ledger: [],
    receipts: [],
    admission: null,
    settled: [],
    rules: { stake: 10, reward: 4 },
    head: '0'.repeat(64),
    sequence: 0,
    admission_counter: 0,
    last_status: 'NOT ADMITTED',
    last_checks: [],
    notice: {
      title: 'Choose a module to begin',
      detail:
        'Reserve a refundable admission stake. The preview protects the maximum pool liability before work begins.',
      tone: '',
    },
  });
  let state = initial(),
    busy = false;
  function assertAccounting(s) {
    if (
      ![s.wallet, s.held, s.pool, s.pool_reserved].every((v) => Number.isSafeInteger(v) && v >= 0)
    )
      throw Error('The staged ledger has an invalid balance.');
    if (s.wallet + s.held + s.pool + s.pool_reserved !== 120)
      throw Error('The staged ledger does not conserve its 120 demo credits.');
    if (s.admission && (s.held !== s.admission.stake || s.pool_reserved !== s.admission.liability))
      throw Error('Admission reserves do not match the staged ledger.');
    if (!s.admission && (s.held || s.pool_reserved))
      throw Error('A terminal settlement cannot retain reserved funds.');
  }
  function log(s, title, delta, kind) {
    s.ledger.push({
      title,
      delta,
      kind,
      wallet: s.wallet,
      held: s.held,
      pool_available: s.pool,
      pool_reserved: s.pool_reserved,
    });
  }
  function notice(s, title, detail, tone = '') {
    s.notice = { title, detail, tone };
  }
  async function transition(type, change) {
    const next = structuredClone(state),
      data = change(next);
    assertAccounting(next);
    const body = {
      sequence: state.sequence + 1,
      type,
      policy_version: VERSION,
      data: structuredClone({
        ...data,
        balances: {
          wallet: next.wallet,
          held: next.held,
          pool_available: next.pool,
          pool_reserved: next.pool_reserved,
        },
      }),
      previous_hash: state.head,
      prototype: true,
    };
    const hash = await digest(body);
    next.sequence = body.sequence;
    next.head = hash;
    next.receipts.push({ ...body, hash });
    state = next;
    return structuredClone(next.receipts.at(-1));
  }
  function render() {
    if (!mount) return;
    const a = state.admission;
    $('wallet').textContent = state.wallet;
    $('held').textContent = state.held;
    $('pool').textContent = state.pool;
    $('pool-reserved').textContent = state.pool_reserved;
    $('ledger').replaceChildren();
    if (!state.ledger.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent =
        'Start with 20 non-cash demo credits. Stake holds, pool reserves and awards appear separately.';
      $('ledger').append(p);
    }
    state.ledger
      .slice()
      .reverse()
      .forEach((e) => {
        const row = document.createElement('div');
        row.className = 'ledger-row';
        const left = document.createElement('div');
        left.textContent = e.title;
        const small = document.createElement('small');
        small.textContent = `${e.kind} · available ${e.wallet}, held ${e.held}, pool ${e.pool_available} + ${e.pool_reserved} reserved`;
        const delta = document.createElement('span');
        delta.className = 'delta';
        delta.textContent = (e.delta > 0 ? '+' : '') + e.delta + ' cr';
        left.append(small);
        row.append(left, delta);
        $('ledger').append(row);
      });
    $('reserve').disabled = busy || !!a;
    $('run').disabled = busy || !a || a.stage !== 'RESERVED';
    $('settle').disabled = busy || !a || !['CHECKED_PASS', 'CHECKED_REJECT'].includes(a.stage);
    $('review-fault').disabled =
      busy || !a || a.stage !== 'FAULT_RECORDED' || a.fault?.reviewed === true;
    $('burn').disabled = busy || !a;
    $('reset').disabled = busy;
    $('export').disabled = busy || !state.receipts.length;
    $('module').disabled = busy || !!a;
    $('stake').disabled = busy || !!a || state.receipts.length > 0;
    $('reward').disabled = busy || !!a || state.receipts.length > 0;
    $('evaluation-scenario').disabled = busy || !a || a.stage !== 'RESERVED';
    $('burn-reason').disabled = busy || !a;
    $('admission-state').textContent = a ? a.stage : state.last_status;
    $('module-hash').textContent =
      a?.hash || state.receipts.at(-1)?.data.module_hash || 'No digest yet';
    $('receipt').textContent = state.receipts.length
      ? JSON.stringify(state.receipts.at(-1), null, 2)
      : 'Reserve a module to create a local record.';
    $('result-title').textContent = state.notice.title;
    $('result-detail').textContent = state.notice.detail;
    $('result').dataset.state = state.notice.tone;
    $('fault-status').textContent = a?.fault
      ? a.fault.reviewed
        ? 'Fixture reviewed: bound to this admission. Still simulated evidence.'
        : 'Fault fixture recorded. Review it before seeking compensation.'
      : 'No active admission fault. Any earlier fixture remains in receipt history.';
    $('checks').replaceChildren();
    for (const [name, outcome] of a?.checks || state.last_checks) {
      const li = document.createElement('li'),
        label = document.createElement('span'),
        result = document.createElement('span');
      label.textContent = name;
      result.textContent = outcome;
      result.className = outcome === 'PASS' ? 'check' : outcome === 'FAIL' ? 'reject' : 'muted';
      li.append(label, result);
      $('checks').append(li);
    }
  }
  async function operation(fn) {
    if (busy) {
      if (!mount) throw Error('Another credit transition is already in progress.');
      return;
    }
    busy = true;
    render();
    try {
      return await fn();
    } catch (e) {
      if (!mount) throw e;
      state.notice = {
        title: 'Action refused · balances unchanged',
        detail: e.message,
        tone: 'fail',
      };
    } finally {
      busy = false;
      render();
    }
  }
  function requireAdmission(s) {
    if (!s.admission) throw Error('No active admission to settle or revoke.');
    return s.admission;
  }
  function close(s, a, bonus, compensation, status) {
    if (s.settled.includes(a.hash))
      throw Error('This module digest already has a terminal outcome.');
    if (bonus && compensation)
      throw Error('Success bonuses and fault compensation cannot be combined.');
    if (bonus + compensation > a.liability)
      throw Error('The award exceeds its protected pool liability.');
    s.wallet += a.stake + bonus + compensation;
    s.held -= a.stake;
    s.pool += a.liability - bonus - compensation;
    s.pool_reserved -= a.liability;
    s.settled.push(a.hash);
    s.last_checks = a.checks;
    s.admission = null;
    s.last_status = status;
  }
  const actions = {};
  actions.reserve = (moduleId = 'rigid', stake = 10, reward = 4) =>
    operation(async () => {
      if (!Object.hasOwn(modules, moduleId)) throw Error('Choose a trusted synthetic module.');
      const module = modules[moduleId];
      if (
        !Number.isInteger(stake) ||
        stake < 1 ||
        stake > 20 ||
        !Number.isInteger(reward) ||
        reward < 0 ||
        reward > 20
      )
        throw Error('Use a whole-number stake from 1–20 and a bonus from 0–20.');
      const hash = await digest({
        algorithm: module.algorithm,
        boundary: module.boundary,
        dataset: 'four-point-rectangle',
        claim: 'pairwise-metric-preservation',
      });
      await transition('admission-reserved', (s) => {
        if (s.admission) throw Error('An admission is already active.');
        if (s.settled.includes(hash))
          throw Error(
            'This module digest is already settled or revoked. Renaming it cannot earn another award in this sandbox.',
          );
        const liability = Math.max(stake, reward);
        if (s.wallet < stake) throw Error('The available demo balance cannot cover this stake.');
        if (s.pool < liability)
          throw Error('The available pool cannot protect the maximum liability.');
        if (s.receipts.length && (s.rules.stake !== stake || s.rules.reward !== reward))
          throw Error('Policy parameters are locked for this sandbox.');
        s.rules = { stake, reward };
        s.wallet -= stake;
        s.held += stake;
        s.pool -= liability;
        s.pool_reserved += liability;
        s.admission = {
          id: 'A-' + String(++s.admission_counter).padStart(4, '0'),
          hash,
          module,
          stake,
          reward,
          liability,
          stage: 'RESERVED',
          checks: [],
          fault: null,
          policy_version: VERSION,
        };
        s.last_checks = [];
        log(s, 'Admission stake held', -stake, 'refundable user stake');
        log(s, 'Maximum pool liability protected', 0, 'pool reserve, not a user award');
        notice(
          s,
          'Reserved · no reward earned yet',
          'Run normal checks or a clearly labelled host-fault scenario. Selecting a burn reason alone never creates compensation eligibility.',
        );
        return {
          admission_id: s.admission.id,
          module_hash: hash,
          stake,
          reward,
          pool_liability: liability,
          balances: {
            wallet: s.wallet,
            held: s.held,
            pool: s.pool,
            pool_reserved: s.pool_reserved,
          },
        };
      });
    });
  actions.run = (scenario = 'normal') =>
    operation(() =>
      transition('evaluation-recorded', (s) => {
        if (!['normal', 'host-fault'].includes(scenario))
          throw Error('Choose a defined evaluation scenario.');
        const a = requireAdmission(s);
        if (a.stage !== 'RESERVED') throw Error('This admission has already been evaluated.');
        const boundary = a.module.boundary === 'derived-only';
        if (!boundary) {
          a.stage = 'CHECKED_REJECT';
          a.checks = [
            ['Derived-only boundary', 'FAIL'],
            ['Metric checks', 'NOT RUN'],
          ];
          notice(
            s,
            'Boundary rejected · stake remains held',
            'No raw data was captured. Settle to recover the stake, with no bonus or compensation.',
            'fail',
          );
        } else if (scenario === 'host-fault') {
          a.stage = 'FAULT_RECORDED';
          a.fault = {
            fixture: 'host-outage-before-evaluation-v1',
            admission_id: a.id,
            module_hash: a.hash,
            phase: 'before-metric-evaluation',
            simulated: true,
            reviewed: false,
          };
          a.checks = [
            ['Derived-only boundary', 'PASS'],
            ['Host evaluation', 'SIMULATED FAULT'],
          ];
          notice(
            s,
            'Host fault fixture recorded · not yet eligible',
            'Review this admission-bound fixture. A fault label is not a refund decision.',
          );
        } else {
          const rigid = a.module.algorithm === 'rotate-four-point-field',
            errors = [0.2, 0.6, 1].map((x) =>
              residual(transformPoints(rigid ? 'rotation' : 'shear', x)),
            ),
            pass = errors.every((e) => e <= 1e-6);
          a.metric_errors = errors;
          a.stage = pass ? 'CHECKED_PASS' : 'CHECKED_REJECT';
          a.checks = [
            ['Derived-only boundary', 'PASS'],
            ['Three synthetic metric vectors', pass ? 'PASS' : 'FAIL'],
          ];
          notice(
            s,
            pass ? 'Checks passed · settlement pending' : 'Metric rejected · settlement pending',
            pass
              ? 'A sample pass is not general certification. Settle once to return the stake and award the fixed bonus.'
              : 'Settle once to return the stake. Rejected work earns no bonus and is not scored as personal worth.',
            pass ? 'pass' : 'fail',
          );
        }
        return {
          admission_id: a.id,
          module_hash: a.hash,
          stage: a.stage,
          checks: a.checks,
          metric_errors: a.metric_errors || null,
          fault: a.fault,
        };
      }),
    );
  actions.settle = () =>
    operation(() =>
      transition('contribution-settled', (s) => {
        const a = requireAdmission(s);
        if (!['CHECKED_PASS', 'CHECKED_REJECT'].includes(a.stage))
          throw Error('Run normal checks before settling a contribution.');
        const pass = a.stage === 'CHECKED_PASS',
          bonus = pass ? a.reward : 0;
        close(s, a, bonus, 0, pass ? 'SETTLED_PASS' : 'SETTLED_REJECT');
        log(
          s,
          'Admission stake returned',
          a.stake,
          pass ? 'successful work' : 'rejected work, no penalty',
        );
        if (bonus) log(s, 'Working-module usage bonus', bonus, 'fixed reward from protected pool');
        log(s, 'Unused pool liability released', 0, 'no compensation combined with success bonus');
        notice(
          s,
          pass ? 'Settled once · stake returned + bonus' : 'Rejected work settled · stake returned',
          `${a.stake} refunded${bonus ? ' + ' + bonus + ' demo bonus' : ''}. This digest is closed for the current sandbox.`,
          pass ? 'pass' : '',
        );
        return {
          admission_id: a.id,
          module_hash: a.hash,
          outcome: pass ? 'synthetic-checks-pass' : 'rejected',
          stake_returned: a.stake,
          bonus,
          compensation: 0,
          metric_errors: a.metric_errors || null,
          policy_version: VERSION,
        };
      }),
    );
  actions.reviewFault = () =>
    operation(() =>
      transition('fault-fixture-reviewed', (s) => {
        const a = requireAdmission(s),
          f = a.fault;
        if (a.stage !== 'FAULT_RECORDED' || !f || f.reviewed)
          throw Error('Record an unreviewed host fault before reviewing it.');
        if (
          f.fixture !== 'host-outage-before-evaluation-v1' ||
          f.admission_id !== a.id ||
          f.module_hash !== a.hash ||
          f.phase !== 'before-metric-evaluation' ||
          f.simulated !== true ||
          a.module.boundary !== 'derived-only'
        )
          throw Error('The fixture is not an eligible admission-bound host fault.');
        f.reviewed = true;
        notice(
          s,
          'Simulated fault review recorded',
          'The fixture matches this admission. A system-fault burn may now return the stake plus equal compensation. This is not independent real-world adjudication.',
        );
        return {
          admission_id: a.id,
          module_hash: a.hash,
          fixture: f.fixture,
          eligible_in_demo: true,
          simulated: true,
          independent_adjudication: false,
        };
      }),
    );
  actions.burn = (reason = 'voluntary') =>
    operation(() =>
      transition('admission-burned', (s) => {
        const a = requireAdmission(s);
        if (!['voluntary', 'system-fault'].includes(reason))
          throw Error('Choose a defined burn reason.');
        const eligible = reason === 'system-fault';
        if (eligible && !(a.stage === 'FAULT_RECORDED' && a.fault?.reviewed === true))
          throw Error(
            'A double return needs an admission-bound host fault and its recorded fixture review. Choosing “system fault” is not sufficient.',
          );
        const compensation = eligible ? a.stake : 0;
        close(s, a, 0, compensation, 'REVOKED');
        log(s, 'Burn: refundable stake returned', a.stake, 'topology admission revoked');
        if (compensation)
          log(
            s,
            'Burn: eligible fault compensation',
            compensation,
            'equal to stake, funded from protected pool',
          );
        log(s, 'Unused pool liability released', 0, 'module digest and receipt history retained');
        notice(
          s,
          eligible ? 'Revoked · reviewed double return' : 'Revoked · ordinary stake refund',
          `${a.stake} stake refund${eligible ? ' + ' + compensation + ' compensation' : ''}; net compensation is ${compensation}. The hash survives. No success bonus is also paid.`,
        );
        return {
          admission_id: a.id,
          module_hash: a.hash,
          reason,
          hash_preserved: true,
          admission_revoked: true,
          stake_returned: a.stake,
          bonus: 0,
          compensation,
          total_return: a.stake + compensation,
          net_compensation: compensation,
          fault_fixture: a.fault,
          independent_adjudication: false,
        };
      }),
    );
  actions.reset = () => {
    if (busy) {
      if (!mount) throw Error('Another credit transition is already in progress.');
      return;
    }
    state = initial();
    if (mount) {
    $('stake').value = 10;
    $('reward').value = 4;
    $('evaluation-scenario').value = 'normal';
    $('burn-reason').value = 'voluntary';
    }
    render();
  };
  if (mount) {
  $('reserve').onclick = () => actions.reserve(
    $('module').value, Number($('stake').value), Number($('reward').value),
  );
  $('run').onclick = () => actions.run($('evaluation-scenario').value);
  $('settle').onclick = actions.settle;
  $('review-fault').onclick = actions.reviewFault;
  $('burn').onclick = () => actions.burn($('burn-reason').value);
  $('reset').onclick = actions.reset;
  $('export').onclick = () => {
    $('receipt').textContent = JSON.stringify({
      prototype: true,
      policy_version: VERSION,
      coupling: 'Scandoc Zero',
      rules: {
        ...state.rules,
        reserve_liability: 'max(stake,success_bonus)',
        eligible_burn: 'recorded admission-bound host fault + recorded simulated fixture review',
        double_return:
          'original stake refund + equal compensation; net compensation equals one stake',
        duplicate_policy: 'one terminal outcome per normalized module digest in this sandbox',
        bonus_and_compensation_mutually_exclusive: true,
        no_raw_data_reward: true,
        no_social_scoring: true,
        not_persistent: true,
        not_real_money: true,
      },
      wallet: state.wallet,
      held: state.held,
      pool_available: state.pool,
      pool_reserved: state.pool_reserved,
      conserved_total: 120,
      admission: state.admission,
      ledger: state.ledger,
      receipt_history: state.receipts,
      head: state.head,
    }, null, 2);
    $('result-title').textContent = 'Virtual ledger inspected · memory only';
    $('result-detail').textContent = 'No file, account balance or persistent store was created. Reload resets every virtual value.';
  };
  $('draft').onclick = () => {
    const note = $('message').value.trim();
    if (!note) {
      $('draft-status').textContent = 'Write a message first.';
      return;
    }
    $('draft-output').textContent =
      'SCANDOC ZERO / LOCAL COMMUNICATION DRAFT\n\n' +
      note +
      '\n\nScope: module relations and evidence.\nNo message sent. No AI inference performed. No credits awarded for conversation.';
    $('draft-status').textContent = 'Draft organised locally. Its content is not scored.';
  };
  }
  render();
  return Object.freeze({
    ...actions,
    getState: () => structuredClone(state),
    assertAccounting,
  });
}
const session = mounted ? communicate({ mount: true }) : null;
const api = Object.freeze({ createEngine: () => communicate(), get session() { return session; } });
if (typeof module === 'object' && module.exports) module.exports = api;
else {
  globalThis.CommunicateCore = api;
  globalThis.InvariantCredit = api;
}
})();
