/* ==========================================================
   Núcleo criptográfico — alfabeto español de 27 letras (A–Z + Ñ)
   ========================================================== */
const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
const N = ALPHABET.length; // 27

const FREQ_ES = {
  A:12.53, B:1.42, C:4.68, D:5.86, E:13.68, F:0.69, G:1.01, H:0.70,
  I:6.25,  J:0.44, K:0.02, L:4.97, M:3.15,  N:6.71, Ñ:0.31,
  O:8.68,  P:2.51, Q:0.88, R:6.87, S:7.98,  T:4.63, U:3.93,
  V:0.90,  W:0.01, X:0.22, Y:0.90, Z:0.52
};

function normalize(str) {
  str = str.toUpperCase();
  const accentMap = { 'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ü':'U' };
  str = str.replace(/[ÁÉÍÓÚÜ]/g, c => accentMap[c]);
  return str.split('').filter(c => ALPHABET.includes(c)).join('');
}

function shiftText(text, k) {
  k = ((k % N) + N) % N;
  return text.split('').map(ch => {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return ch;
    return ALPHABET[(idx + k) % N];
  }).join('');
}
const caesarEncrypt = (text, k) => shiftText(text, k);
const caesarDecrypt = (text, k) => shiftText(text, -k);

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }

function modInverse(a, m) {
  a = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) { if ((a * x) % m === 1) return x; }
  return null;
}

function affineEncrypt(text, a, b) {
  return text.split('').map(ch => {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return ch;
    return ALPHABET[(((a * idx + b) % N) + N) % N];
  }).join('');
}

function affineDecrypt(text, a, b) {
  const ainv = modInverse(a, N);
  if (ainv === null) return null;
  return text.split('').map(ch => {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return ch;
    return ALPHABET[(((ainv * (idx - b)) % N) + N) % N];
  }).join('');
}

function vigenereShiftText(text, key, sign) {
  const k = key.split('').map(c => ALPHABET.indexOf(c));
  if (k.some(v => v === -1) || k.length === 0) return null;
  let j = 0;
  return text.split('').map(ch => {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return ch;
    const kshift = k[j % k.length] * sign;
    j++;
    return ALPHABET[(((idx + kshift) % N) + N) % N];
  }).join('');
}
const vigenereEncrypt = (text, key) => vigenereShiftText(text, key, 1);
const vigenereDecrypt = (text, key) => vigenereShiftText(text, key, -1);

function indiceCoincidencia(text) {
  const counts = {};
  for (const ch of text) counts[ch] = (counts[ch] || 0) + 1;
  const Nn = text.length;
  if (Nn < 2) return 0;
  let sum = 0;
  for (const ch in counts) { const ni = counts[ch]; sum += ni * (ni - 1); }
  return sum / (Nn * (Nn - 1));
}

function frecuencias(text) {
  const counts = {};
  for (const c of ALPHABET) counts[c] = 0;
  for (const ch of text) { if (counts[ch] !== undefined) counts[ch]++; }
  const Nn = text.length || 1;
  return ALPHABET.split('').map(c => ({ letra: c, cuenta: counts[c], pct: (counts[c] / Nn) * 100 }));
}

function chiSquare(text) {
  const f = frecuencias(text);
  const Nn = text.length || 1;
  let chi = 0;
  for (const { letra, cuenta } of f) {
    const esperado = (FREQ_ES[letra] / 100) * Nn;
    if (esperado > 0) chi += Math.pow(cuenta - esperado, 2) / esperado;
  }
  return chi;
}

function kasiski(text, minLen = 3, maxLen = 5) {
  const seqMap = {};
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i + len <= text.length; i++) {
      const seq = text.substr(i, len);
      (seqMap[seq] = seqMap[seq] || []).push(i);
    }
  }
  const distances = [];
  for (const seq in seqMap) {
    const pos = seqMap[seq];
    if (pos.length > 1) {
      for (let i = 1; i < pos.length; i++) distances.push(pos[i] - pos[0]);
    }
  }
  const factorCount = {};
  for (const d of distances) {
    for (let f = 2; f <= 20; f++) { if (d % f === 0) factorCount[f] = (factorCount[f] || 0) + 1; }
  }
  return { distances, factorCount };
}

function vigenereColumns(text, L) {
  const cols = Array.from({ length: L }, () => '');
  for (let i = 0; i < text.length; i++) cols[i % L] += text[i];
  return cols;
}

function bestShiftFor(columnText) {
  let best = { k: 0, score: Infinity };
  for (let k = 0; k < N; k++) {
    const cand = caesarDecrypt(columnText, k);
    const score = chiSquare(cand);
    if (score < best.score) best = { k, score };
  }
  return best;
}

/* ==========================================================
   UI wiring
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {

  // Navigation
  const steps = document.querySelectorAll('.step');
  steps.forEach(btn => {
    btn.addEventListener('click', () => {
      steps.forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).classList.add('active');
    });
  });

  /* ---------- 01 Normalizar ---------- */
  const rawInput = document.getElementById('rawInput');
  const normOutput = document.getElementById('normOutput');
  const lenTag = document.getElementById('lenTag');

  document.getElementById('btnNormalize').addEventListener('click', () => {
    const norm = normalize(rawInput.value);
    normOutput.value = norm;
    lenTag.textContent = norm.length + ' car.';
  });

  document.getElementById('btnUseAsCipher').addEventListener('click', () => {
    const val = normOutput.value;
    if (!val) return;
    ['expectedCipher', 'icInput', 'freqInput', 'cesarInput', 'afinInput', 'vigInput']
      .forEach(id => document.getElementById(id).value = val);
  });

  /* ---------- 02 Cifrar / validar ---------- */
  const methodTabs = document.querySelectorAll('#cifrarMethodTabs .mtab');
  let currentMethod = 'cesar';
  methodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      methodTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMethod = tab.dataset.method;
      document.querySelectorAll('.param-cesar').forEach(el => el.style.display = currentMethod === 'cesar' ? '' : 'none');
      document.querySelectorAll('.param-afin').forEach(el => el.style.display = currentMethod === 'afin' ? '' : 'none');
      document.querySelectorAll('.param-vigenere').forEach(el => el.style.display = currentMethod === 'vigenere' ? '' : 'none');
    });
  });

  document.getElementById('btnEncrypt').addEventListener('click', () => {
    const text = normOutput.value || normalize(rawInput.value);
    let result = '';
    if (currentMethod === 'cesar') {
      const k = parseInt(document.getElementById('cesarK').value, 10) || 0;
      result = caesarEncrypt(text, k);
    } else if (currentMethod === 'afin') {
      const a = parseInt(document.getElementById('afinA').value, 10);
      const b = parseInt(document.getElementById('afinB').value, 10);
      if (gcd(a, N) !== 1) {
        document.getElementById('encryptOutput').value = '';
        setVerdict('validateVerdict', `a=${a} no es coprimo con 27 — elige otro valor.`, false);
        return;
      }
      result = affineEncrypt(text, a, b);
    } else {
      const key = normalize(document.getElementById('vigenereKey').value);
      result = vigenereEncrypt(text, key) || '';
    }
    document.getElementById('encryptOutput').value = result;
    compareToExpected();
  });

  document.getElementById('expectedCipher').addEventListener('input', compareToExpected);

  function compareToExpected() {
    const got = document.getElementById('encryptOutput').value;
    const expected = normalize(document.getElementById('expectedCipher').value);
    if (!got || !expected) { setVerdict('validateVerdict', '', null); return; }
    if (got === expected) {
      setVerdict('validateVerdict', '✓ Coincide exactamente con el criptograma esperado.', true);
    } else {
      let i = 0;
      while (i < got.length && i < expected.length && got[i] === expected[i]) i++;
      setVerdict('validateVerdict', `✗ No coincide. Primera diferencia en la posición ${i + 1} (obtenido "${got[i] || '∅'}", esperado "${expected[i] || '∅'}").`, false);
    }
  }

  function setVerdict(id, msg, ok) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('ok', 'bad');
    if (ok === true) el.classList.add('ok');
    if (ok === false) el.classList.add('bad');
  }

  /* ---------- 03 IC ---------- */
  document.getElementById('btnCalcIC').addEventListener('click', () => {
    const text = normalize(document.getElementById('icInput').value);
    const ic = indiceCoincidencia(text);
    document.getElementById('icValue').textContent = ic.toFixed(4);
    const pct = Math.min(100, (ic / 0.09) * 100);
    document.getElementById('icFill').style.width = pct + '%';
    let verdict;
    if (ic >= 0.060) {
      verdict = `IC = <strong>${ic.toFixed(4)}</strong> — cercano a 0.077 (ES) o 0.066 (EN). Probablemente <strong>monoalfabético</strong> (César o Afín).`;
    } else if (ic <= 0.050) {
      verdict = `IC = <strong>${ic.toFixed(4)}</strong> — cercano al rango 0.038–0.045. Probablemente <strong>polialfabético</strong> (Vigenère).`;
    } else {
      verdict = `IC = <strong>${ic.toFixed(4)}</strong> — valor intermedio; con textos cortos el IC es ruidoso. Revisa también las frecuencias.`;
    }
    document.getElementById('icVerdict').innerHTML = verdict;
  });

  /* ---------- 04 Frecuencias ---------- */
  document.getElementById('btnCalcFreq').addEventListener('click', () => {
    const text = normalize(document.getElementById('freqInput').value);
    renderFreqChart(text, 'freqChart');
    const f = frecuencias(text).slice().sort((a, b) => b.cuenta - a.cuenta);
    document.getElementById('freqTop').innerHTML =
      `<span>Más frecuente: <strong>${f[0].letra}</strong> (${f[0].pct.toFixed(2)}%)</span>` +
      `<span>2.ª: <strong>${f[1].letra}</strong> (${f[1].pct.toFixed(2)}%)</span>` +
      `<span>3.ª: <strong>${f[2].letra}</strong> (${f[2].pct.toFixed(2)}%)</span>`;
  });

  function renderFreqChart(text, containerId) {
    const f = frecuencias(text);
    const maxPct = Math.max(...f.map(x => x.pct), ...Object.values(FREQ_ES)) || 1;
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    f.forEach(({ letra, pct }) => {
      const wrap = document.createElement('div');
      wrap.className = 'freq-bar-wrap';
      const bar = document.createElement('div');
      bar.className = 'freq-bar';
      bar.style.height = (pct / maxPct * 100) + '%';
      const ref = document.createElement('div');
      ref.className = 'freq-ref-mark';
      ref.style.bottom = (FREQ_ES[letra] / maxPct * 100) + '%';
      bar.appendChild(ref);
      const label = document.createElement('div');
      label.className = 'freq-letter';
      label.textContent = letra;
      wrap.appendChild(bar);
      wrap.appendChild(label);
      el.appendChild(wrap);
    });
  }

  /* ---------- 05a César ---------- */
  document.getElementById('btnBruteCesar').addEventListener('click', () => {
    const text = normalize(document.getElementById('cesarInput').value);
    const rows = [];
    for (let k = 0; k < N; k++) {
      const candidate = caesarDecrypt(text, k);
      rows.push({ k, score: chiSquare(candidate), candidate });
    }
    rows.sort((a, b) => a.score - b.score);
    const tbody = document.querySelector('#cesarResults tbody');
    tbody.innerHTML = rows.map(r =>
      `<tr><td>${r.k}</td><td>${r.score.toFixed(1)}</td><td class="wrap">${r.candidate.slice(0, 140)}</td></tr>`
    ).join('');
  });

  /* ---------- 05b Afín ---------- */
  function fillPlainLetterSelects() {
    const options = ALPHABET.split('').map(c => `<option value="${c}">${c}</option>`).join('');
    ['afinP1', 'afinP2'].forEach(id => document.getElementById(id).innerHTML = options);
    document.getElementById('afinP1').value = 'E';
    document.getElementById('afinP2').value = 'A';
  }
  fillPlainLetterSelects();

  document.getElementById('btnAfinFreq').addEventListener('click', () => {
    const text = normalize(document.getElementById('afinInput').value);
    const f = frecuencias(text).slice().sort((a, b) => b.cuenta - a.cuenta);
    const container = document.getElementById('afinFreqTable');
    container.innerHTML = f.map(x =>
      `<div class="freq-mini-cell"><span>${x.letra}</span><span>${x.pct.toFixed(1)}%</span></div>`
    ).join('');
    const cipherOptions = f.map(x => `<option value="${x.letra}">${x.letra} (${x.pct.toFixed(1)}%)</option>`).join('');
    document.getElementById('afinC1').innerHTML = cipherOptions;
    document.getElementById('afinC2').innerHTML = cipherOptions;
    document.getElementById('afinC1').selectedIndex = 0;
    document.getElementById('afinC2').selectedIndex = 1;
  });

  document.getElementById('btnSolveAfin').addEventListener('click', () => {
    const text = normalize(document.getElementById('afinInput').value);
    const c1 = ALPHABET.indexOf(document.getElementById('afinC1').value);
    const c2 = ALPHABET.indexOf(document.getElementById('afinC2').value);
    const p1 = ALPHABET.indexOf(document.getElementById('afinP1').value);
    const p2 = ALPHABET.indexOf(document.getElementById('afinP2').value);

    const diffP = ((p1 - p2) % N + N) % N;
    const diffPinv = modInverse(diffP, N);
    if (diffPinv === null) {
      setVerdict('afinVerdict', 'Esa pareja de letras claras no es invertible mod 27 (no son coprimas). Elige otra combinación.', false);
      document.getElementById('afinOutput').value = '';
      return;
    }
    const a = ((((c1 - c2) * diffPinv) % N) + N) % N;
    if (gcd(a, N) !== 1) {
      setVerdict('afinVerdict', `El sistema da a=${a}, que no es coprimo con 27. Prueba otra pareja de letras.`, false);
      document.getElementById('afinOutput').value = '';
      return;
    }
    const b = ((c1 - a * p1) % N + N) % N;
    const plain = affineDecrypt(text, a, b);
    document.getElementById('afinOutput').value = plain;
    setVerdict('afinVerdict', `a = ${a}, b = ${b}  (χ² del resultado: ${chiSquare(plain).toFixed(1)}, cuanto más bajo, más plausible)`, true);
  });

  /* ---------- 05c Vigenère / Kasiski ---------- */
  document.getElementById('btnKasiski').addEventListener('click', () => {
    const text = normalize(document.getElementById('vigInput').value);
    const { factorCount } = kasiski(text);
    const entries = Object.entries(factorCount)
      .filter(([f]) => Number(f) <= 12)
      .sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...entries.map(e => e[1]), 1);
    const container = document.getElementById('kasiskiFactors');
    if (entries.length === 0) {
      container.innerHTML = '<p style="font-family:var(--mono);font-size:12px;color:var(--gray-500)">No se hallaron secuencias repetidas suficientes; prueba con un criptograma más largo.</p>';
      return;
    }
    container.innerHTML = entries.map(([f, count]) =>
      `<div class="factor-row">
        <span class="fl-label">${f}</span>
        <span class="fl-bar-track"><span class="fl-bar" style="width:${(count / maxCount) * 100}%"></span></span>
        <span class="fl-count">${count}</span>
      </div>`
    ).join('');
    document.getElementById('vigKeyLen').value = entries[0][0];
  });

  document.getElementById('btnSolveVigenere').addEventListener('click', () => {
    const text = normalize(document.getElementById('vigInput').value);
    const L = parseInt(document.getElementById('vigKeyLen').value, 10) || 1;
    const cols = vigenereColumns(text, L);
    const keyIdx = cols.map(col => bestShiftFor(col).k);
    const key = keyIdx.map(i => ALPHABET[i]).join('');
    const plain = vigenereDecrypt(text, key);
    document.getElementById('vigOutput').value = plain;
    setVerdict('vigVerdict', `Clave hallada: "${key}"  (χ² del resultado: ${chiSquare(plain).toFixed(1)}, cuanto más bajo, más plausible)`, true);
  });

});
