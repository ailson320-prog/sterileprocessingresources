'use strict';

const types = {
  mosquito: { name: 'Curved mosquito hemostat', required: 2, clue: 'Finger rings and a ratchet, with long, fine curved jaws and closely spaced serrations.' },
  mayo: { name: 'Straight Mayo scissors', required: 1, clue: 'Finger rings and a pivot screw. The broad, straight blades overlap at the cutting edge.' },
  adson: { name: 'Adson tissue forceps (1×2)', required: 1, clue: 'Thumb-operated spring handle with no finger rings. One tooth fits between two opposing teeth.' },
  needle: { name: 'Mayo-Hegar needle holder', required: 1, clue: 'Finger rings and a ratchet, with short, straight, blunt jaws and a crosshatched gripping surface.' }
};

const startingTray = [
  { type: 'mayo', soil: 'joint' },
  { type: 'mosquito', soil: null },
  { type: 'adson', soil: 'tip' },
  { type: 'needle', soil: null },
  { type: 'mosquito', soil: 'tip' }
];

const get = id => document.getElementById(id);
const viewButtons = Array.from(document.querySelectorAll('[data-view]'));
const canvas = get('instrument');
const ctx = canvas.getContext('2d');
const totalRequired = Object.values(types).reduce((sum, type) => sum + type.required, 0);
let state;

function reset() {
  state = {
    queue: startingTray.map((item, index) => ({ ...item, number: index + 1 })),
    packed: Object.fromEntries(Object.keys(types).map(type => [type, 0])),
    records: [], viewed: new Set(), view: 'full', status: 'inspecting',
    returned: 0, identityErrors: 0, inspectionErrors: 0, expanded: false
  };
  get('notice').textContent = '';
  updateSheet();
  showInstrument();
}

function showInstrument() {
  const item = state.queue[0];
  const isForceps = item.type === 'adson';
  const secondArea = isForceps ? 'Handle and spring' : 'Joint';
  state.viewed.clear();
  state.expanded = false;
  state.status = 'inspecting';
  get('work').hidden = false;
  get('debrief').hidden = true;
  get('advance').hidden = true;
  get('notice').textContent = '';
  get('piece').textContent = item.replaces ? 'Item ' + item.number + ' · Replacement for item ' + item.replaces : 'Item ' + item.number;
  get('identity').value = '';
  get('finding').value = '';
  get('joint-view').textContent = secondArea;
  get('joint-option').textContent = secondArea;
  selectView('full');
}

function selectView(view) {
  state.view = view;
  state.viewed.add(view);
  for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === view));
  const item = state.queue[0];
  draw(item, view);
  const captions = {
    full: 'Compare the shape of the handle and working end.',
    tip: 'Look closely at the working surfaces, including grooves, teeth, or blade edges.',
    joint: item.type === 'adson' ? 'Look along the spring, thumb grips, and handle.' : 'Look closely around the joint and nearby surfaces.'
  };
  get('view-caption').textContent = captions[view];
  const areaDescription = view === 'full'
    ? types[item.type].clue
    : captions[view] + (item.soil === view ? ' An irregular reddish-brown deposit is visible on the metal.' : ' The metal surfaces look uniform here.');
  canvas.setAttribute('aria-label', 'Simulated inspection view. ' + areaDescription);
  updateControls();
}

function updateControls() {
  const ready = state.viewed.has('tip') && state.viewed.has('joint');
  const identified = Boolean(get('identity').value);
  get('observations').hidden = !state.expanded;
  get('add').disabled = !ready || !identified || state.expanded;
  get('return').disabled = !ready || !identified || (state.expanded && !get('finding').value);
  get('return').textContent = state.expanded ? 'Confirm reprocessing' : 'Soiled · Reprocess and replace';
  get('cancel').hidden = !state.expanded;
  get('requirements').textContent = !ready ? 'Open both close-ups before making a decision.' :
    !identified ? 'Select an instrument name from the count sheet.' :
    state.expanded ? 'Record where you saw soil before sending the instrument back.' : 'Both close-ups reviewed. Choose how to handle the instrument.';
}

function notify(message, warning = false) {
  const notice = get('notice');
  notice.classList.toggle('warn', warning);
  notice.textContent = message;
}

function decide(reprocess) {
  if (state.status !== 'inspecting' || !state.viewed.has('tip') || !state.viewed.has('joint')) return;
  const item = state.queue[0];
  const selected = get('identity').value;
  if (!selected) return;
  if (reprocess && !state.expanded) {
    state.expanded = true;
    updateControls();
    get('finding').focus();
    return;
  }
  if (reprocess && !get('finding').value) return;

  if (selected !== item.type) {
    state.identityErrors++;
    notify('That identification doesn’t match. Compare the working end and handle with the identification reference.', true);
    record('Item ' + item.number + ' · Identification mismatch flagged.');
    return;
  }
  if (!reprocess && item.soil) {
    state.inspectionErrors++;
    notify('Tray addition blocked. Look again for an uneven reddish-brown deposit on the instrument.', true);
    record('Item ' + item.number + ' · Soiled instrument kept out of the tray.');
    return;
  }
  if (reprocess && get('finding').value !== item.soil) {
    state.inspectionErrors++;
    notify(item.soil ? 'The deposit is in a different area. Recheck the close-ups before recording the finding.' :
      'Both inspection areas are free of visible soil. Review the close-ups and reconsider the disposition.', true);
    record('Item ' + item.number + ' · Soil finding did not match the inspection view.');
    return;
  }
  const type = types[item.type];
  if (reprocess) {
    state.returned++;
    state.queue.splice(1, 0, { type: item.type, soil: null, number: startingTray.length + state.returned, replaces: item.number });
    notify(type.name + ' sent back for reprocessing. Inspect the replacement before adding it to the tray.');
    record(type.name + ' · Returned for reprocessing. Replacement issued.');
  } else {
    state.packed[item.type]++;
    notify(type.name + ' added. ' + state.packed[item.type] + ' of ' + type.required + ' on the count sheet.');
    record(type.name + ' · Packed (' + state.packed[item.type] + '/' + type.required + ').');
  }
  state.status = 'decided';
  get('work').hidden = true;
  get('advance').hidden = false;
  get('next').textContent = state.queue.length === 1 ? 'Reconcile tray count' :
    reprocess ? 'Inspect replacement' : 'Inspect next instrument';
  updateSheet();
  get('next').focus();
}

function record(message) {
  state.records.push(message);
  const row = document.createElement('li');
  row.textContent = message;
  get('history').prepend(row);
  get('empty-log').hidden = true;
}

function updateSheet() {
  get('counts').innerHTML = Object.entries(types).map(([key, type]) => {
    const count = state.packed[key];
    return '<tr><th scope="row">' + type.name + '</th><td>' + type.required + '</td><td' +
      (count === type.required ? ' class="done"' : '') + '>' + count + '</td></tr>';
  }).join('');
  const packed = Object.values(state.packed).reduce((sum, count) => sum + count, 0);
  get('tray-total').textContent = packed + ' / ' + totalRequired;
  if (state.records.length === 0) {
    get('history').replaceChildren();
    get('empty-log').hidden = false;
  }
}

function advance() {
  if (state.status !== 'decided') return;
  state.queue.shift();
  if (state.queue.length > 0) {
    showInstrument();
  } else {
    const matched = Object.entries(types).every(([key, type]) => state.packed[key] === type.required);
    state.status = 'complete';
    get('notice').textContent = '';
    get('piece').textContent = '';
    get('advance').hidden = true;
    get('debrief').hidden = false;
    get('debrief').innerHTML = '<div class="result"><h3>' + (matched ? 'Tray complete' : 'Count discrepancy') +
      '</h3><p>' + (matched ? 'All five instruments match the count sheet and passed the simulated visual inspection. The assembled tray is ready for the next processing step.' :
        'The packed quantities differ from the count sheet. Review each row.') +
      '</p><p><strong>' + state.returned + '</strong> returned for reprocessing · <strong>' + state.identityErrors +
      '</strong> identification errors · <strong>' + state.inspectionErrors +
      '</strong> inspection errors</p><button class="primary" id="replay" type="button">Replay lab</button></div>';
    get('replay').onclick = () => { reset(); get('station-title').focus(); };
  }
  get('station-title').focus();
}

const scene = { width: 760, height: 320 };
const inspectionAreas = {
  mayo: { tip: [566, 155, 4.3], joint: [383, 160, 5.05] },
  mosquito: { tip: [531, 128, 4.4], joint: [382, 160, 5.15] },
  needle: { tip: [501, 157, 4.9], joint: [382, 160, 5.05] },
  adson: { tip: [581, 160, 5], joint: [318, 158, 2.2] }
};
const soilSites = {
  mayo: [386, 166, -.27],
  mosquito: [532, 141, -.56],
  adson: [588, 166, -.28]
};

function stroke(path, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(new Path2D(path));
}

function steel(path, x1, y1, x2, y2) {
  const surface = new Path2D(path);
  const light = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [position, color] of [
    [0, '#61747a'], [.16, '#ecf1f1'], [.37, '#adbfc1'], [.55, '#81979d'],
    [.73, '#b6c7c9'], [.88, '#e2e9e9'], [1, '#536770']
  ]) light.addColorStop(position, color);
  ctx.fillStyle = light;
  ctx.fill(surface, 'evenodd');
  ctx.lineWidth = .75;
  ctx.strokeStyle = '#364b53';
  ctx.stroke(surface);
}

function ellipse(x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function ring(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  steel('M -35 0 C -35 -18 -20 -29 0 -29 C 21 -29 35 -17 35 0 C 35 17 20 29 0 29 C -20 29 -35 18 -35 0 Z M -27 0 C -27 13 -15 21 0 21 C 15 21 27 13 27 0 C 27 -13 15 -21 0 -21 C -15 -21 -27 -13 -27 0 Z', -8, -29, 8, 28);
  stroke('M -33 -2 C -32 -17 -17 -26 0 -26 C 14 -26 24 -21 30 -13', 1, '#f7ffffb0');
  stroke('M -24 11 C -17 26 16 27 26 10', 1, '#f4ffff80');
  ctx.restore();
}

function ratchet(x, y, flip) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, flip);
  steel('M 0 -4 Q 14 -4 18 3 L 29 21 L 25 24 L 23 20 L 21 23 L 19 19 L 17 22 L 15 18 L 13 21 L 7 12 L 0 10 Z', 3, 0, 20, 22);
  stroke('M 10 8 L 21 19', 1.1, '#f3fafab0');
  ctx.restore();
}

function hinge(type) {
  if (type !== 'mayo') {
    steel('M 360 152 Q 366 143 385 144 Q 399 145 408 152 L 407 165 Q 393 176 372 175 Q 364 174 359 169 Z', 380, 144, 386, 175);
    stroke('M 364 154 Q 379 150 400 152 M 365 169 Q 380 173 399 167', 1, '#dcebedac');
  }
  ellipse(382, 160, type === 'mayo' ? 10 : 7, type === 'mayo' ? 9 : 6.5, '#536970');
  ellipse(381.7, 159.6, type === 'mayo' ? 8.3 : 5.8, type === 'mayo' ? 7.5 : 5.4, '#b4c4c6');
  stroke(type === 'mayo' ? 'M 376 163 L 388 157' : 'M 378 158 Q 382 155 386 158', 1.4, type === 'mayo' ? '#425960' : '#edf6f5');
}

function drawScissorBlades() {
  steel('M 377 155 Q 415 157 443 161 L 607 181 Q 621 182 624 188 Q 621 194 606 192 L 453 179 Q 404 177 378 170 Z', 476, 157, 471, 183);
  stroke('M 423 167 L 610 185 Q 617 185 620 188', 1.4, '#edf7f5');
  steel('M 376 152 Q 406 144 439 143 L 606 127 Q 620 125 623 132 Q 622 137 608 141 L 452 160 Q 411 168 378 168 Z', 476, 133, 481, 161);
  stroke('M 419 160 L 608 138 Q 616 137 620 133', 1.45, '#f8ffff');
  stroke('M 428 153 L 610 131', .7, '#8fa4a7');
}

function drawMosquitoJaws() {
  steel('M 379 158 Q 429 158 469 153 Q 511 148 553 121 Q 573 108 581 108 Q 584 110 581 114 Q 549 146 502 158 Q 451 172 380 170 Z', 497, 143, 505, 158);
  steel('M 378 150 Q 432 145 467 142 Q 509 137 548 112 Q 564 101 571 100 Q 575 102 572 107 Q 551 132 514 144 Q 460 160 379 162 Z', 490, 131, 495, 150);
  stroke('M 477 148 Q 528 141 571 109 M 484 158 Q 538 149 578 115', .9, '#344f57');
  for (let offset = 0; offset < 82; offset += 3.7) {
    const x = 483 + offset;
    const curve = offset * (.23 + offset * .0035);
    stroke('M ' + x + ' ' + (149 - curve) + ' l -2.3 -4 m 7 12 l -2.4 -4', .85, '#526970');
  }
}

function drawNeedleJaws() {
  steel('M 376 157 Q 419 160 449 164 L 543 169 Q 552 169 553 177 Q 552 183 543 183 L 449 180 Q 412 179 377 172 Z', 488, 163, 487, 183);
  steel('M 376 150 Q 409 144 449 141 L 541 135 Q 551 136 552 142 Q 551 150 542 151 L 448 158 Q 406 165 376 165 Z', 487, 137, 488, 156);
  for (const [x, y, tilt] of [[459, 150, -.06], [459, 170, .055]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    steel('M 0 -5 L 81 -5 Q 85 0 81 5 L 0 5 Z', 2, -5, 3, 5);
    for (let offset = 3; offset < 77; offset += 4) {
      stroke('M ' + offset + ' -4 l 6 8 m -6 0 l 6 -8', .7, '#435b61');
    }
    ctx.restore();
  }
}

function drawHandled(type) {
  const mosquito = type === 'mosquito';
  const left = mosquito ? 187 : 151;
  ring(left, 114, .3);
  ring(left, 206, -.3);
  const neck = left + 25;
  steel('M ' + neck + ' 200 Q 260 184 366 154 Q 384 148 394 156 L 395 165 Q 383 170 368 171 Q 269 188 ' + (neck + 2) + ' 212 Z', 276, 184, 274, 198);
  steel('M ' + neck + ' 108 Q 251 123 367 148 Q 390 149 395 156 L 394 166 Q 376 171 366 166 Q 259 144 ' + (neck + 2) + ' 120 Z', 267, 128, 263, 145);
  stroke('M ' + (neck + 7) + ' 112 Q 271 130 359 151 M ' + (neck + 7) + ' 204 Q 260 188 347 174', 1.1, '#f4ffffb8');
  if (type !== 'mayo') {
    ratchet(neck + 2, 124, 1);
    ratchet(neck + 1, 197, -1);
  }
  if (type === 'mayo') drawScissorBlades();
  else if (mosquito) drawMosquitoJaws();
  else drawNeedleJaws();
  hinge(type);
}

function drawForceps() {
  steel('M 124 154 Q 130 142 149 140 L 233 125 Q 340 108 440 127 L 483 137 Q 529 144 585 153 L 594 154 L 597 159 L 594 163 L 587 160 Q 529 155 474 149 L 438 144 Q 337 131 238 142 L 158 157 Q 139 161 127 161 Z', 298, 117, 298, 145);
  steel('M 124 161 Q 133 155 159 163 L 242 179 Q 339 189 439 175 L 480 169 Q 528 165 586 162 L 593 162 L 592 158 L 596 159 L 598 164 L 596 168 L 587 170 Q 534 174 483 183 L 442 189 Q 339 207 237 195 L 151 178 Q 131 175 124 161 Z', 298, 178, 298, 199);
  stroke('M 133 150 Q 229 119 325 122 Q 421 121 466 137 M 132 166 Q 226 196 329 194 Q 409 195 465 180', 1.1, '#effcfabc');
  for (let x = 266; x < 416; x += 5.1) {
    const bend = Math.pow((x - 332) / 75, 2) * 5;
    stroke('M ' + x + ' ' + (119 + bend) + ' l 2.5 10 M ' + x + ' ' + (187 - bend) + ' l 2.5 9', 1, '#5d747b');
    stroke('M ' + (x + 1.1) + ' ' + (120 + bend) + ' l 2.5 8 M ' + (x + 1.1) + ' ' + (188 - bend) + ' l 2.5 7', .8, '#ecf4f1b4');
  }
  stroke('M 585 154 L 593 156 L 594 159 M 585 168 L 590 166 L 590 164 M 592 168 L 596 166', 1, '#f7ffff');
}

function drawSoil(type) {
  const [x, y, rotation] = soilSites[type];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (type === 'adson') ctx.scale(.72, .72);
  const deposit = ctx.createLinearGradient(0, -4, 0, 5);
  deposit.addColorStop(0, '#a65e40');
  deposit.addColorStop(.52, '#833b2c');
  deposit.addColorStop(1, '#592721');
  ctx.fillStyle = deposit;
  ctx.fill(new Path2D('M -10 -1 C -8 -3 -7 -4 -4 -3 C -2 -5 1 -4 3 -2 C 6 -3 9 -2 10 0 C 8 3 5 3 2 3 Q -1 6 -4 3 Q -6 4 -7 2 Q -11 2 -10 -1 Z'));
  ellipse(-5.3, -1.3, 1.4, .8, '#c48a60ab');
  ellipse(.7, .4, 2.3, .7, '#c48a605c');
  ellipse(8, 3.1, 1.1, .7, '#743b2f');
  ellipse(-12, .9, 1.15, .8, '#7f3b31');
  ctx.restore();
}

function makeMat() {
  const mat = document.createElement('canvas');
  mat.width = canvas.width;
  mat.height = canvas.height;
  const surface = mat.getContext('2d');
  const light = surface.createRadialGradient(mat.width * .36, 0, 40, mat.width * .43, mat.height * .43, mat.width * .67);
  light.addColorStop(0, '#567d7a');
  light.addColorStop(.55, '#355f5d');
  light.addColorStop(1, '#244544');
  surface.fillStyle = light;
  surface.fillRect(0, 0, mat.width, mat.height);
  for (let y = 1; y < mat.height; y += 3) {
    for (let x = 1; x < mat.width; x += 3) {
      const grain = (x * 17 ^ y * 41 ^ x * y) & 15;
      surface.fillStyle = grain > 7 ? '#e5fff415' : '#051b201f';
      surface.fillRect(x, y, grain % 2 + 1, 1);
    }
  }
  return mat;
}

const mat = makeMat();

function drawIllustration(item, view) {
  ctx.drawImage(mat, 0, 0);
  const [x, y, scale] = view === 'full' ? [380, 160, 1.17] : inspectionAreas[item.type][view];
  ctx.save();
  ctx.scale(canvas.width / scene.width, canvas.height / scene.height);
  ctx.translate(scene.width / 2, scene.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = view === 'full' ? 5 : 8;
  ctx.shadowOffsetY = view === 'full' ? 4 : 6;
  ctx.shadowColor = '#05161aaa';
  if (item.type === 'adson') drawForceps();
  else drawHandled(item.type);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (item.soil) drawSoil(item.type);
  ctx.restore();
}

// Landmarks are fractions of the cropped original photos, shared by the overview and close-ups.
const photoLandmarks = {
  mayo: { tip: [.91, .53], joint: [.65, .528] },
  adson: { tip: [.90, .53], joint: [.27, .43] },
  mosquito: { tip: [.92, .55], joint: [.74, .56] },
  needle: { tip: [.93, .39], joint: [.80, .41] }
};
const photos = {};
for (const type of Object.keys(photoLandmarks)) {
  const photo = new Image();
  photos[type] = photo;
  photo.onload = () => {
    if (state?.status === 'inspecting' && state.queue[0]?.type === type) draw(state.queue[0], state.view);
  };
  photo.src = 'instruments/' + type + '.svg';
}

const adsonTip = new Image();
adsonTip.onload = () => {
  if (state?.status === 'inspecting' && state.queue[0]?.type === 'adson' && state.view === 'tip') {
    draw(state.queue[0], state.view);
  }
};
adsonTip.src = 'instruments/adson-tip.svg';

function draw(item, view) {
  const macro = item.type === 'adson' && view === 'tip' && adsonTip.complete && adsonTip.naturalWidth;
  const photo = macro ? adsonTip : photos[item.type];
  if (!photo.complete || !photo.naturalWidth) {
    drawIllustration(item, view);
    return;
  }
  const width = photo.naturalWidth;
  const height = photo.naturalHeight;
  const landmarks = photoLandmarks[item.type];
  const overview = view === 'full' || macro;
  const [x, y] = overview ? [.5, .5] : landmarks[view];
  const fit = Math.min(canvas.width / width, canvas.height / height);
  const scale = overview ? fit : fit * (item.type === 'adson' ? 3.0 : 3.5);
  // Keep the cutout inside the same image where possible.
  const offset = (fraction, size, viewport) => size * scale <= viewport
    ? (viewport - size * scale) / 2
    : Math.min(0, Math.max(viewport - size * scale, viewport / 2 - fraction * size * scale));
  ctx.drawImage(mat, 0, 0);
  ctx.save();
  ctx.translate(offset(x, width, canvas.width), offset(y, height, canvas.height));
  ctx.scale(scale, scale);
  ctx.drawImage(photo, 0, 0);
  if (item.soil) {
    const [soilX, soilY] = macro ? [.48, .74] : landmarks[item.soil];
    const [illustrationX, illustrationY] = soilSites[item.type];
    ctx.translate(soilX * width, soilY * height);
    const soilScale = width / (macro ? 280 : 1250);
    ctx.scale(soilScale, soilScale);
    ctx.translate(-illustrationX, -illustrationY);
    drawSoil(item.type);
  }
  ctx.restore();
}

for (const [key, type] of Object.entries(types)) {
  const option = document.createElement('option');
  option.value = key;
  option.textContent = type.name;
  get('identity').append(option);
  const entry = document.createElement('li');
  entry.textContent = type.name + '. ' + type.clue;
  get('reference').append(entry);
}

for (const button of viewButtons) button.onclick = () => selectView(button.dataset.view);
get('identity').onchange = updateControls;
get('finding').onchange = updateControls;
get('add').onclick = () => decide(false);
get('return').onclick = () => decide(true);
get('cancel').onclick = () => {
  state.expanded = false;
  get('finding').value = '';
  updateControls();
  get('return').focus();
};
get('next').onclick = advance;
get('restart').onclick = () => {
  if (state.status !== 'complete' && state.records.length && !window.confirm('Restart the lab and clear your tray and log?')) return;
  reset();
  get('station-title').focus();
};
reset();
