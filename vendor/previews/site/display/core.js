'use strict';
// Local integration change: isolated scope, optional DOM mounting and reusable core exports.
(() => {
const $ = (id) => globalThis.document?.getElementById(id);
const MODE = globalThis.document?.documentElement.dataset.mode || 'display';
const mounted = MODE === 'display' && !!$('zero-map');
const SCHEMA = 'scandoc-zero-manifest-preview/v1';
const LEGS = ['tap', 'surface', 'science', 'communicate', 'manifest', 'display'];
const LABELS = {
  tap: 'Tap',
  surface: 'Surface',
  science: 'Science',
  communicate: 'Communicate',
  manifest: 'Manifest',
  display: 'Display',
};
const NOTES = {
  tap: 'Contact and gesture instrument. Distinct from Surface; coupled at Scandoc Zero.',
  surface:
    'Surface-facing instrument. Different local encounters meet the common topology junction.',
  science:
    'Knowledge environment. Questions, counterexamples and experiments without an incentive layer.',
  communicate:
    'Module collaboration environment. Credit rules belong to its separate simulated policy.',
  manifest: 'Declared contracts, source lineage, scoped evidence and content-bound receipts.',
  display: 'Inspectable topology, transformation views and Manifest-linked evidence status.',
};
const GRAPH = {
  nodes: ['zero', ...LEGS],
  edges: LEGS.map((id) => ({ from: id, to: 'zero' })),
  interpretation: 'declared-six-leg-map-not-measured-coupling',
};
const BASE = [
  [0, 0],
  [1, 0],
  [1, 0.75],
  [0, 0.75],
];
const PAIRS = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];
let focus = MODE,
  view = 'relations',
  current = null,
  busy = false,
  history = [],
  head = '0'.repeat(64);
if (mounted) document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
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
async function hash(v) {
  if (!globalThis.crypto?.subtle)
    throw Error('Content hashing needs the hosted preview or a secure browser context.');
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(v)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function snapshot(v) {
  return structuredClone(v);
}
function transform(kind, a) {
  return BASE.map(([x, y]) =>
    kind === 'rotation'
      ? [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
      : kind === 'shear'
        ? [x + a * y, y]
        : kind === 'translation'
          ? [x + a, y + 0.4 * a]
          : [x, y],
  );
}
function sample(kind, amount, relation) {
  if (kind === 'none')
    return {
      status: 'declared-only',
      scope: 'no-experiment',
      kind,
      amount,
      metric_residual: null,
      declared_components: 1,
      observed_components: null,
      verdict: null,
      tolerance: 1e-6,
    };
  const points = transform(kind, amount),
    distance = (p, i, j) => Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]);
  const residual = Math.max(
    ...PAIRS.map(([i, j]) => Math.abs(distance(points, i, j) - distance(BASE, i, j))),
  );
  const preserved = relation === 'connectivity' || residual <= 1e-6;
  return {
    status: preserved ? 'sample-supported' : 'sample-counterexample',
    scope: 'synthetic-four-point-field-with-fixed-cycle-edges',
    kind,
    amount,
    metric_residual: residual,
    declared_components: 1,
    observed_components: 1,
    verdict: preserved,
    tolerance: 1e-6,
  };
}
function defaultBody(kind = 'none') {
  return {
    title: 'Tap-Surface relation at Scandoc Zero',
    revision: 'draft-1',
    provenance: {
      origin: 'Synthetic preview fixture',
      source_revision: 'local-example',
      verified: false,
    },
    contract: {
      input: 'tap',
      output: 'surface',
      junction: 'zero',
      relation: 'pairwise-distance',
      boundary: 'derived-only',
    },
    topology: snapshot(GRAPH),
    evidence: sample(kind, 0.5, 'pairwise-distance'),
    limits: {
      prototype: true,
      live_agi: false,
      sphere_canonical: false,
      raw_media_captured: false,
      independent_verification: false,
    },
  };
}
async function envelope(body, previous = '0'.repeat(64), sequence = 1) {
  const m = snapshot(body),
    digest = await hash(m),
    r = {
      sequence,
      manifest_digest: digest,
      previous_receipt_hash: previous,
      format: 'local-preview-receipt-v1',
    };
  return {
    schema: SCHEMA,
    manifest: m,
    manifest_digest: digest,
    receipt: { ...r, receipt_hash: await hash(r) },
  };
}
function statusName(s) {
  return (
    {
      'declared-only': 'Declared only',
      'sample-supported': 'Sample supported',
      'sample-counterexample': 'Sample counterexample',
    }[s] || 'No record'
  );
}
function setStatus(title, detail, state = '') {
  $('action-title').textContent = title;
  $('action-detail').textContent = detail;
  $('action-status').dataset.state = state;
}
function download(name, value) {
  const u = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    ),
    a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function palette() {
  const c = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    ['bg', 'panel', 'accent', 'amber', 'muted', 'ink', 'grid', 'danger'].map((k) => [
      k,
      c.getPropertyValue('--' + k).trim(),
    ]),
  );
}
const canvas = $('zero-map'),
  ctx = canvas?.getContext('2d');
let w = 1,
  h = 1;
function draw() {
  const p = palette();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = p.grid;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.7;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (view === 'transformations' && current && current.manifest.evidence.kind !== 'none') {
    const e = current.manifest.evidence,
      points = transform(e.kind, e.amount),
      s = Math.min(w * 0.19, h * 0.33),
      ox = w * 0.31,
      oy = h * 0.61;
    for (const [field, color, dash] of [
      [BASE, p.accent, [5, 4]],
      [points, p.amber, []],
    ]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      ctx.beginPath();
      field.forEach(([x, y], i) =>
        i ? ctx.lineTo(ox + x * s, oy - y * s) : ctx.moveTo(ox + x * s, oy - y * s),
      );
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      field.forEach(([x, y]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ox + x * s, oy - y * s, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
    ctx.textAlign = 'left';
    ctx.font = '12px Satoshi, sans-serif';
    ctx.fillStyle = p.muted;
    ctx.fillText('Dashed: original  /  amber: transformed', 20, h - 22);
    return;
  }
  const small = w < 600,
    cx = w * 0.5,
    cy = h * 0.5,
    rad = small ? 33 : 44;
  const positions = {
    tap: [w * 0.22, h * 0.18],
    surface: [w * 0.78, h * 0.18],
    science: [w * 0.16, cy],
    communicate: [w * 0.84, cy],
    manifest: [w * 0.22, h * 0.82],
    display: [w * 0.78, h * 0.82],
  };
  for (const leg of LEGS) {
    const [x, y] = positions[leg];
    ctx.strokeStyle = leg === focus ? p.amber : p.accent;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = leg === focus ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    const boxW = small ? (leg === 'communicate' ? 100 : 84) : 138;
    ctx.fillStyle = p.panel;
    ctx.fillRect(x - boxW / 2, y - 18, boxW, 36);
    ctx.strokeRect(x - boxW / 2, y - 18, boxW, 36);
    ctx.fillStyle = p.ink;
    ctx.font = `${small ? 12 : 14}px Satoshi, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LABELS[leg], x, y);
  }
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.55 - i * 0.12;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad + 11 + i * 11, rad + 8 + i * 10, 0.3, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.font = `bold ${small ? 12 : 15}px Satoshi, sans-serif`;
  ctx.fillText('SCANDOC', cx, cy - 8);
  ctx.fillText('ZERO', cx, cy + 11);
  if (view === 'evidence') {
    ctx.fillStyle =
      current?.manifest.evidence.status === 'sample-counterexample' ? p.danger : p.muted;
    ctx.font = '12px Satoshi, sans-serif';
    ctx.fillText(
      current
        ? statusName(current.manifest.evidence.status) + ' · four-point scope'
        : 'No bound evidence',
      cx,
      h - 19,
    );
  }
}
function resize() {
  const r = canvas.getBoundingClientRect(),
    d = Math.min(devicePixelRatio || 1, 2);
  w = r.width;
  h = r.height;
  canvas.width = Math.round(w * d);
  canvas.height = Math.round(h * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  draw();
}
if (mounted) {
new ResizeObserver(resize).observe(canvas);
$('theme').onclick = () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  draw();
};
$('leg-focus').onchange = () => {
  focus = $('leg-focus').value;
  $('leg-note').textContent = NOTES[focus];
  draw();
};
}
function renderRecord() {
  const e = current?.manifest.evidence;
  $('evidence-badge').textContent = e ? statusName(e.status) : 'Unbound draft';
  $('evidence-badge').dataset.state = e?.status || '';
  $('record-title').textContent =
    current?.manifest.title || 'Bind a declaration to create a record.';
  $('digest').textContent = current?.manifest_digest || 'No bound digest';
  $('record').textContent = current
    ? JSON.stringify(current, null, 2)
    : 'No bound record. Editing a draft invalidates its current export, not earlier local receipts.';
  if ($('export')) $('export').disabled = busy || !current;
  if ($('scope')) $('scope').textContent = e?.scope || 'No bound experiment';
  if ($('residual'))
    $('residual').textContent =
      e?.metric_residual != null ? e.metric_residual.toExponential(3) : 'Not measured';
  if ($('relation-label'))
    $('relation-label').textContent = current
      ? current.manifest.contract.relation === 'connectivity'
        ? 'Fixed graph connectivity'
        : 'Pairwise distance'
      : 'No declared relation';
  if ($('verdict'))
    $('verdict').textContent =
      e?.verdict === true
        ? 'Sample supports claim'
        : e?.verdict === false
          ? 'Counterexample found'
          : 'No experiment';
  if ($('source-label'))
    $('source-label').textContent = current?.manifest.provenance.origin || 'No source';
  if ($('view-caption'))
    $('view-caption').textContent =
      view === 'transformations'
        ? !current || current.manifest.evidence.kind === 'none'
          ? 'No experiment is bound; the declared relation map is retained.'
          : 'Computed synthetic four-point field. Not the production engine.'
        : view === 'evidence'
          ? 'Evidence is scoped to the synthetic case, not to every leg or the hidden core.'
          : 'Dashed edges show declared relations, not measured physical coupling.';
  draw();
}
async function operation(fn) {
  if (busy) return;
  busy = true;
  lock();
  try {
    await fn();
  } catch (e) {
    setStatus('Action refused', e.message, 'fail');
  } finally {
    busy = false;
    lock();
    renderRecord();
  }
}
function lock() {
  for (const el of document.querySelectorAll('[data-work-control]')) el.disabled = busy;
  if ($('export')) $('export').disabled = busy || !current;
  if ($('export-history')) $('export-history').disabled = busy || !history.length;
  if ($('record-select'))
    $('record-select').disabled = busy || $('record-select').options.length < 2;
}
function keys(v, expected) {
  if (
    !v ||
    typeof v !== 'object' ||
    Array.isArray(v) ||
    Object.keys(v).sort().join('|') !== [...expected].sort().join('|')
  )
    throw Error('The record contains missing or unsupported fields.');
}
function boundedText(v, max) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}
async function verify(value) {
  value = snapshot(value);
  keys(value, ['schema', 'manifest', 'manifest_digest', 'receipt']);
  if (value.schema !== SCHEMA)
    throw Error(
      'Only the Scandoc Zero Manifest preview format is accepted. Other receipt formats are not interchangeable.',
    );
  const m = value.manifest;
  keys(m, ['title', 'revision', 'provenance', 'contract', 'topology', 'evidence', 'limits']);
  keys(m.provenance, ['origin', 'source_revision', 'verified']);
  keys(m.contract, ['input', 'output', 'junction', 'relation', 'boundary']);
  if (
    !boundedText(m.title, 120) ||
    !boundedText(m.revision, 80) ||
    !boundedText(m.provenance.origin, 240) ||
    !boundedText(m.provenance.source_revision, 80) ||
    m.provenance.verified !== false
  )
    throw Error('Provenance must be bounded text and explicitly unverified.');
  if (
    m.contract.input !== 'tap' ||
    m.contract.output !== 'surface' ||
    m.contract.junction !== 'zero' ||
    m.contract.boundary !== 'derived-only' ||
    !['pairwise-distance', 'connectivity'].includes(m.contract.relation)
  )
    throw Error('The declared ports, relation or zero-data boundary are unsupported.');
  if (canonical(m.topology) !== canonical(GRAPH))
    throw Error('This preview only accepts the declared six-leg relation map.');
  if (canonical(m.limits) !== canonical(defaultBody().limits))
    throw Error(
      'A preview record cannot claim AGI, canonical sphere validation or independent verification.',
    );
  const e = m.evidence;
  keys(e, [
    'status',
    'scope',
    'kind',
    'amount',
    'metric_residual',
    'declared_components',
    'observed_components',
    'verdict',
    'tolerance',
  ]);
  if (
    !['none', 'translation', 'rotation', 'shear'].includes(e.kind) ||
    typeof e.amount !== 'number' ||
    !Number.isFinite(e.amount) ||
    e.amount < 0 ||
    e.amount > 1
  )
    throw Error('The synthetic case or its amount is unsupported.');
  const expected = sample(e.kind, e.amount, m.contract.relation);
  const { metric_residual: claimedResidual, ...claimedFields } = e,
    { metric_residual: expectedResidual, ...expectedFields } = expected;
  const residualMatches =
    expectedResidual === null
      ? claimedResidual === null
      : typeof claimedResidual === 'number' &&
        Number.isFinite(claimedResidual) &&
        Math.abs(claimedResidual - expectedResidual) <= 1e-9;
  if (canonical(claimedFields) !== canonical(expectedFields) || !residualMatches)
    throw Error('The evidence label or values do not match recomputation of the synthetic case.');
  const r = value.receipt;
  keys(r, ['sequence', 'manifest_digest', 'previous_receipt_hash', 'format', 'receipt_hash']);
  const hex = (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
  if (
    !hex(value.manifest_digest) ||
    !hex(r.previous_receipt_hash) ||
    !hex(r.receipt_hash) ||
    !Number.isSafeInteger(r.sequence) ||
    r.sequence < 1 ||
    r.format !== 'local-preview-receipt-v1'
  )
    throw Error('The receipt fields are invalid.');
  if ((await hash(m)) !== value.manifest_digest || r.manifest_digest !== value.manifest_digest)
    throw Error('Manifest content digest mismatch. The record is not loaded.');
  const { receipt_hash, ...receiptBody } = r;
  if ((await hash(receiptBody)) !== receipt_hash)
    throw Error('Receipt content digest mismatch. The record is not loaded.');
  return snapshot(value);
}
if (mounted) {
if (MODE === 'manifest') {
  function readDraft() {
    const b = defaultBody($('case').value);
    b.title = $('title').value.trim();
    b.revision = $('revision').value.trim();
    b.provenance.origin = $('origin').value.trim();
    b.provenance.source_revision = $('source-revision').value.trim();
    b.contract.relation = $('relation').value;
    b.evidence = sample($('case').value, Number($('amount').value) / 100, b.contract.relation);
    if (
      !boundedText(b.title, 120) ||
      !boundedText(b.revision, 80) ||
      !boundedText(b.provenance.origin, 240) ||
      !boundedText(b.provenance.source_revision, 80)
    )
      throw Error('Give the title, revision and source fields a nonempty bounded value.');
    return b;
  }
  function changed() {
    current = null;
    $('amount-label').textContent = (Number($('amount').value) / 100).toFixed(2);
    setStatus(
      'Draft changed · bind before exporting',
      'The previous local receipt remains in history. The new declaration is not yet bound.',
    );
    renderRecord();
  }
  for (const id of ['title', 'revision', 'origin', 'source-revision', 'relation', 'case', 'amount'])
    $(id).addEventListener(id === 'case' || id === 'relation' ? 'change' : 'input', changed);
  $('bind').onclick = () =>
    operation(async () => {
      if (history.length >= 16)
        throw Error(
          'This sandbox holds 16 receipts. Export its history or reset before binding another revision.',
        );
      const candidate = await envelope(readDraft(), head, history.length + 1);
      await verify(candidate);
      current = snapshot(candidate);
      history.push(snapshot(candidate));
      head = candidate.receipt.receipt_hash;
      $('receipt-count').textContent = history.length + ' local receipts';
      $('export-history').disabled = false;
      setStatus(
        'Manifest bound · evidence status retained',
        'The digest binds this exact declaration and synthetic result. It does not authenticate the source or prove the claim.',
        'pass',
      );
    });
  $('export').onclick = () => {
    if (current) download('scandoc-zero-manifest.json', current);
  };
  $('export-history').onclick = () => {
    if (history.length)
      download('scandoc-zero-manifest-history.json', {
        schema: 'scandoc-zero-manifest-history-preview/v1',
        records: history,
        head,
      });
  };
  $('reset').onclick = () => {
    if (busy) return;
    history = [];
    head = '0'.repeat(64);
    current = null;
    $('receipt-count').textContent = '0 local receipts';
    $('export-history').disabled = true;
    setStatus('Sandbox reset', 'The editor remains; local bound records were discarded.');
    renderRecord();
  };
} else {
  let inspectedRecords = [];
  function installRecords(records, origin) {
    inspectedRecords = records;
    const select = $('record-select');
    select.replaceChildren(...records.map((record, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${index + 1}. ${record.manifest.title} · ${statusName(record.manifest.evidence.status)}`;
      return option;
    }));
    select.disabled = records.length < 2;
    select.value = '0';
    current = records[0];
    $('load-origin').textContent = origin;
  }
  $('record-select').onchange = () => {
    const record = inspectedRecords[Number($('record-select').value)];
    if (!record || busy) return;
    current = record;
    renderRecord();
  };
  for (const button of document.querySelectorAll('[data-view]'))
    button.onclick = () => {
      view = button.dataset.view;
      for (const b of document.querySelectorAll('[data-view]'))
        b.setAttribute('aria-pressed', String(b === button));
      $('view-caption').textContent =
        view === 'transformations'
          ? current?.manifest.evidence.kind === 'none'
            ? 'No experiment is bound; the declared relation map is retained.'
            : 'Computed synthetic four-point field. Not the production engine.'
          : view === 'evidence'
            ? 'Evidence is scoped to the synthetic case, not to every leg or the hidden core.'
            : 'Dashed edges show declared relations, not measured physical coupling.';
      draw();
    };
  async function loadDemo(kind) {
    const candidate = await envelope(defaultBody(kind));
    installRecords([await verify(candidate)], 'Built-in synthetic example');
    setStatus(
      'Demo loaded · content integrity matched',
      'The synthetic case was recomputed. Source provenance and prior receipt continuity are not independently verified.',
      'pass',
    );
  }
  for (const button of document.querySelectorAll('[data-demo]'))
    button.onclick = () => operation(() => loadDemo(button.dataset.demo));
  $('import').onchange = () =>
    operation(async () => {
      const f = $('import').files[0];
      if (!f) return;
      try {
        if (f.size > 262144) throw Error('The derived preview JSON must be 256 KB or smaller.');
        const parsed = JSON.parse(await f.text());
        let checked;
        if (parsed.schema === 'scandoc-zero-manifest-history-preview/v1') {
          keys(parsed, ['schema', 'records', 'head']);
          if (!Array.isArray(parsed.records) || !parsed.records.length || parsed.records.length > 16)
            throw Error('History must contain 1–16 records.');
          checked = [];
          let previous = '0'.repeat(64);
          for (const record of parsed.records) {
            if (JSON.stringify(record).length > 65536) throw Error('A record exceeds 64 KB.');
            const valid = await verify(record);
            if (valid.receipt.sequence !== checked.length + 1 ||
                valid.receipt.previous_receipt_hash !== previous)
              throw Error('History sequence or internal receipt link mismatch.');
            checked.push(valid);
            previous = valid.receipt.receipt_hash;
          }
          if (parsed.head !== previous) throw Error('History head mismatch.');
        } else {
          if (f.size > 65536) throw Error('A single record must be 64 KB or smaller.');
          checked = [await verify(parsed)];
        }
        installRecords(checked, 'User-selected local JSON · ' + checked.length + ' record(s)');
        setStatus(
          'Local record loaded · content integrity matched',
          'Manifest and receipt digests match; the synthetic case recomputes. This is not authenticated provenance or an anchored receipt chain.',
          'pass',
        );
      } catch (e) {
        setStatus('Import rejected · prior valid view retained', e.message, 'fail');
      } finally {
        $('import').value = '';
      }
    });
  $('export').onclick = () => {
    if (current) download('scandoc-zero-display-record.json', current);
  };
  $('clear').onclick = () => {
    if (busy) return;
    current = null;
    inspectedRecords = [];
    $('record-select').replaceChildren(new Option('No imported records', ''));
    $('record-select').disabled = true;
    $('load-origin').textContent = 'No bound record';
    setStatus(
      'View cleared',
      'The six-leg declaration map remains, but no evidence record is loaded.',
    );
    renderRecord();
  };
  operation(() => loadDemo('none'));
}
$('leg-note').textContent = NOTES[focus];
renderRecord();
}
const api = Object.freeze({
  SCHEMA, canonical, hash, transform, sample, defaultBody, envelope, verify, statusName,
  getState: () => snapshot({ current, history, head }),
});
if (typeof module === 'object' && module.exports) module.exports = api;
else {
  globalThis.DisplayCore = api;
  globalThis.InvariantEvidence ??= api;
}
})();
