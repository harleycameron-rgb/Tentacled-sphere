'use strict';
// Local integration change: optional DOM mounting and reusable synthetic experiment exports.
(() => {
const $ = (id) => globalThis.document?.getElementById(id);
const mode = globalThis.document?.documentElement.dataset.mode || 'science';
const mounted = mode === 'science' && !!$('zero-map');
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
function inspectExperiment(kind, amount) {
  if (!['translation', 'rotation', 'shear'].includes(kind) ||
      typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 1)
    throw Error('Choose a supported synthetic transformation and an amount from 0–1.');
  const e = residual(transformPoints(kind, amount));
  return {
    kind,
    amount,
    max_distance_error: e,
    tolerance: 0.000001,
    preserved: e <= 0.000001,
    dataset: 'synthetic-four-point-rectangle',
    claim: 'metric preservation in this sample only',
    sphere_canonical: false,
  };
}
if (mounted) science();
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
      a = Number($('amount').value) / 100;
    last = {
      id: ++seq,
      ...inspectExperiment(kind, a),
    };
    const e = last.max_distance_error;
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
  $('reset-experiment').onclick = () => {
    $('transformation').value = 'translation';
    $('amount').value = '50';
    $('amount').dispatchEvent(new Event('input', { bubbles: true }));
    last = null;
    $('test-title').textContent = 'Local experiment reset';
    $('test-detail').textContent = 'Choose a transformation and compare. No network or credit system is involved.';
    $('add-observation').disabled = !$('note').value.trim();
  };
  renderJournal();
}
function communicate() {
  const modules = {
    rigid: {
      name: 'Rigid relation module',
      algorithm: 'rotate-four-point-field',
      boundary: 'derived-only',
      pass: true,
    },
    shear: {
      name: 'Shear labelled as metric-invariant',
      algorithm: 'shear-four-point-field',
      boundary: 'derived-only',
      pass: false,
    },
    leak: {
      name: 'Raw-input boundary violation',
      algorithm: 'rotate-four-point-field',
      boundary: 'requests-raw-media',
      pass: false,
    },
  };
  let wallet = 20,
    held = 0,
    pool = 100,
    ledger = [],
    receipt = null,
    receipts = [],
    admission = null,
    settled = new Set(),
    rules = { stake: 10, reward: 4 },
    busy = false,
    head = '0'.repeat(64),
    seq = 0;
  function log(title, delta, kind) {
    ledger.push({ title, delta, kind, wallet, held, pool });
  }
  async function append(type, data) {
    const body = { sequence: ++seq, type, data, previous_hash: head, prototype: true };
    const hash = await digest(body);
    receipt = { ...body, hash };
    receipts.push(receipt);
    head = hash;
    $('receipt').textContent = JSON.stringify(receipt, null, 2);
  }
  function render() {
    $('wallet').textContent = wallet;
    $('held').textContent = held;
    $('pool').textContent = pool;
    $('ledger').replaceChildren();
    if (!ledger.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent =
        'Start with 20 demo credits. Reserve an admission to follow its complete lifecycle.';
      $('ledger').append(p);
    }
    ledger
      .slice()
      .reverse()
      .forEach((e) => {
        const row = document.createElement('div');
        row.className = 'ledger-row';
        const left = document.createElement('div');
        left.textContent = e.title;
        const small = document.createElement('small');
        small.textContent = `${e.kind} · available ${e.wallet}, held ${e.held}, pool ${e.pool}`;
        const delta = document.createElement('span');
        delta.className = 'delta';
        delta.textContent = (e.delta > 0 ? '+' : '') + e.delta + ' cr';
        left.append(small);
        row.append(left, delta);
        $('ledger').append(row);
      });
    $('reserve').disabled = busy || !!admission;
    $('run').disabled = busy || !admission;
    $('burn').disabled = busy || !admission;
    $('reset').disabled = busy;
    $('export').disabled = busy || !ledger.length;
    $('module').disabled = busy || !!admission;
    $('stake').disabled = busy || !!admission || ledger.length > 0;
    $('reward').disabled = busy || !!admission || ledger.length > 0;
    $('admission-state').textContent = admission
      ? 'RESERVED'
      : receipt
        ? receipt.type === 'admission-burned'
          ? 'REVOKED'
          : 'SETTLED'
        : 'NOT ADMITTED';
  }
  async function operation(fn) {
    if (busy) return;
    busy = true;
    render();
    try {
      await fn();
    } catch (e) {
      $('result').dataset.state = 'fail';
      $('result-title').textContent = 'Cannot complete this local action';
      $('result-detail').textContent = e.message;
    } finally {
      busy = false;
      render();
    }
  }
  $('reserve').onclick = () =>
    operation(async () => {
      rules = { stake: Number($('stake').value), reward: Number($('reward').value) };
      if (
        !Number.isInteger(rules.stake) ||
        rules.stake < 1 ||
        rules.stake > 20 ||
        !Number.isInteger(rules.reward) ||
        rules.reward < 0 ||
        rules.reward > 20
      ) {
        throw Error('Use a whole-number stake from 1–20 and a bonus from 0–20.');
      }
      const m = modules[$('module').value],
        hash = await digest(m);
      if (settled.has(hash))
        throw Error(
          'This module digest is already settled or revoked in this session. Choose another module or reset the demo.',
        );
      if (wallet < rules.stake) throw Error('Not enough available demo credits for this stake.');
      if (pool < Math.max(rules.stake, rules.reward))
        throw Error('The demo pool cannot cover this admission’s maximum award.');
      admission = { module: m, hash, stake: rules.stake, reward: rules.reward };
      wallet -= rules.stake;
      held += rules.stake;
      log('Admission reserved', -rules.stake, 'stake held');
      await append('admission-reserved', {
        module_hash: hash,
        stake: rules.stake,
        reward: rules.reward,
      });
      $('module-hash').textContent = hash;
      $('result-title').textContent = 'Admission reserved at Scandoc Zero';
      $('result-detail').textContent =
        'Run the local module checks, or model a burn. No real module has been uploaded.';
      $('result').dataset.state = '';
      $('checks').replaceChildren();
    });
  function checks(list) {
    $('checks').replaceChildren();
    list.forEach(([name, pass]) => {
      const li = document.createElement('li'),
        label = document.createElement('span'),
        state = document.createElement('span');
      label.textContent = name;
      state.textContent = pass ? 'PASS' : 'FAIL';
      state.className = pass ? 'check' : 'reject';
      li.append(label, state);
      $('checks').append(li);
    });
  }
  $('run').onclick = () =>
    operation(async () => {
      if (!admission) return;
      const a = admission,
        m = a.module,
        isRigid = m.algorithm === 'rotate-four-point-field';
      const errors = [0.2, 0.6, 1].map((x) =>
          residual(transformPoints(isRigid ? 'rotation' : 'shear', x)),
        ),
        boundary = m.boundary === 'derived-only',
        metric = errors.every((e) => e <= 1e-6),
        pass = boundary && metric;
      checks([
        ['Derived-only boundary', boundary],
        ['Three synthetic metric vectors', metric],
        ['Digest not already settled', !settled.has(a.hash)],
      ]);
      held -= a.stake;
      wallet += a.stake;
      log('Stake returned', a.stake, pass ? 'successful settlement' : 'rejected module refund');
      if (pass) {
        wallet += a.reward;
        pool -= a.reward;
        log('Working-module bonus', a.reward, 'demo award from pool');
      }
      settled.add(a.hash);
      admission = null;
      await append(pass ? 'module-demo-passed' : 'module-demo-rejected', {
        module_hash: a.hash,
        metric_errors: errors,
        boundary_pass: boundary,
        stake_returned: a.stake,
        bonus: pass ? a.reward : 0,
        wallet,
        held,
        pool,
      });
      $('result').dataset.state = pass ? 'pass' : 'fail';
      $('result-title').textContent = pass
        ? 'Demo checks passed · extra credits modelled'
        : 'Demo rejected · stake returned';
      $('result-detail').textContent = pass
        ? 'This trusted built-in module passed three synthetic checks. The bonus is a proposed usage-credit rule, not general module certification.'
        : 'A failed metric or boundary check earns no bonus. This is not a judgment about its contributor.';
    });
  $('burn').onclick = () =>
    operation(async () => {
      if (!admission) return;
      const a = admission,
        reason = $('burn-reason').value,
        eligible = reason === 'system-fault',
        compensation = eligible ? a.stake : 0;
      if (pool < compensation) throw Error('The demo pool cannot fund this compensation.');
      held -= a.stake;
      wallet += a.stake;
      log('Burn: stake returned', a.stake, 'admission revoked');
      if (compensation) {
        wallet += compensation;
        pool -= compensation;
        log('Burn: equal compensation', compensation, 'eligible simulated system fault');
      }
      settled.add(a.hash);
      admission = null;
      await append('admission-burned', {
        module_hash: a.hash,
        hash_preserved: true,
        admission_revoked: true,
        reason,
        stake_returned: a.stake,
        compensation,
        total_return: a.stake + compensation,
        wallet,
        held,
        pool,
      });
      $('result').dataset.state = '';
      $('result-title').textContent = eligible
        ? 'Eligible burn · double return modelled'
        : 'Voluntary burn · stake returned';
      $('result-detail').textContent =
        `${a.stake} returned${eligible ? ' + ' + compensation + ' compensation' : ''}. Admission is revoked; the digest remains. This digest cannot settle twice in the same demo session.`;
      checks([
        ['Admission revoked', true],
        ['Original module digest retained', true],
        ['Compensation eligibility', eligible],
      ]);
    });
  $('reset').onclick = () => {
    wallet = 20;
    held = 0;
    pool = 100;
    ledger = [];
    receipt = null;
    receipts = [];
    admission = null;
    settled = new Set();
    rules = { stake: 10, reward: 4 };
    head = '0'.repeat(64);
    seq = 0;
    $('stake').value = 10;
    $('reward').value = 4;
    $('module-hash').textContent = 'No digest yet';
    $('receipt').textContent = 'Reserve a module to create a local record.';
    $('checks').replaceChildren();
    $('result-title').textContent = 'Choose a module to begin';
    $('result-detail').textContent =
      'Credits are non-cash demo units. The 100-credit pool funds simulated bonuses and compensation.';
    $('result').dataset.state = '';
    render();
  };
  $('export').onclick = () =>
    download('scandoc-zero-communicate-demo.json', {
      prototype: true,
      coupling: 'Scandoc Zero',
      rules: {
        ...rules,
        eligible_burn: 'simulated-system-fault-only',
        double_return: 'stake refund + equal compensation',
        duplicate_policy: 'one settlement per module digest in this demo session',
        not_persistent: true,
        not_real_money: true,
      },
      wallet,
      held,
      pool,
      ledger,
      receipt_history: receipts,
      latest_receipt: receipt,
    });
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
  render();
}
const api = Object.freeze({ transformPoints, residual, inspectExperiment });
if (typeof module === 'object' && module.exports) module.exports = api;
else globalThis.ScienceCore = api;
})();
