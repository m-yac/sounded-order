import './style.css';
import BESSEL from 'bessel';
import { BESSEL_ZEROS } from './bessel_zeros.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const sliderM = document.getElementById('slider-m');
const sliderN = document.getElementById('slider-n');
const sliderM1 = document.getElementById('slider-m1');
const sliderN1 = document.getElementById('slider-n1');
const sliderTheta = document.getElementById('slider-theta');
const sliderC = document.getElementById('slider-c');
const valueM = document.getElementById('value-m');
const valueN = document.getElementById('value-n');
const valueM1 = document.getElementById('value-m1');
const valueN1 = document.getElementById('value-n1');
const valueTheta = document.getElementById('value-theta');
const valueC = document.getElementById('value-c');
const checkNodes = document.getElementById('check-nodes');
const checkPeaks = document.getElementById('check-peaks');
const checkValleys = document.getElementById('check-valleys');
const freqLabel = document.getElementById('freq-label');
const freqLabel1 = document.getElementById('freq-label-1');
const canvasWrap = document.getElementById('canvas-wrap');
const bgImage = document.getElementById('bg-image');
const fileInput = document.getElementById('file-input');
const soundBtn = document.getElementById('sound-btn');
const soundBtn1 = document.getElementById('sound-btn-1');

// alpha(m, n) returns the nth zero of J_m (n is 1-indexed)
function alpha(m, n) {
  return BESSEL_ZEROS[m][n - 1];
}

// Current mode (init from slider values in case browser restores them)
let m = parseInt(sliderM.value);
let n = parseInt(sliderN.value);
let m1 = parseInt(sliderM1.value);
let n1 = parseInt(sliderN1.value);
let thetaOffset = parseInt(sliderTheta.value) * Math.PI / 180;
let c = parseFloat(sliderC.value);
let showNodes = checkNodes.checked;
let showPeaks = checkPeaks.checked;
let showValleys = checkValleys.checked;

let audioCtx = null;
let oscillator = null;
let oscillator1 = null;
let playing = false;
let playing1 = false;

function getFreqHz(m, n) {
  return alpha(m, n) * 10;
}

function startTone(soundBtn, m, n) {
  if (!audioCtx) audioCtx = new AudioContext();
  let oscillator = audioCtx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = getFreqHz(m, n);
  oscillator.connect(audioCtx.destination);
  oscillator.start();
  soundBtn.textContent = '\u25A0'; // stop square
  soundBtn.classList.add('playing');
  return oscillator;
}

function stopTone(soundBtn, oscillator) {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
  }
  soundBtn.textContent = '\u25B6'; // play triangle
  soundBtn.classList.remove('playing');
  return null;
}

function resize() {
  // Reserve space for controls below (sliders ~80px + margins)
  const controlsHeight = 180;
  const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - controlsHeight - 40);
  const size = Math.max(100, maxSize);
  canvas.width = size;
  canvas.height = size;
  canvasWrap.style.width = size + 'px';
  canvasWrap.style.height = size + 'px';
  updateBgTransform();
  draw();
}

function draw() {
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 10;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const threshold = 0.01;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = dist / radius;

      const idx = (py * width + px) * 4;

      if (r > 1) {
        if (showNodes) {
          // Smoothstep: outer nodal boundary (white)
          const e0 = threshold * 0.5;
          const e1 = threshold * 1.5;
          const t0 = Math.max(0, Math.min(1, ((r-1) - e0) / (e1 - e0)));
          const nodalBlend = t0 * t0 * (3 - 2 * t0);
          data[idx + 0] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255 * (1 - nodalBlend);
        }
        continue;
      }

      const theta = Math.atan2(dy, dx);

      const U = BESSEL.besselj(alpha(m, n) * r, m) * (Math.cos(m == 0 ? 0 : thetaOffset) * Math.cos(m * theta) + Math.sin(m == 0 ? 0 : thetaOffset) * Math.sin(m * theta));

      const U1 = n1 == 0 ? 0 : BESSEL.besselj(alpha(m1, n1) * r, m1) * (Math.cos(m1 == 0 ? 0 : thetaOffset) * Math.cos(m1 * theta) + Math.sin(m1 == 0 ? 0 : thetaOffset) * Math.sin(m1 * theta));

      const Us = U + U1;
      const absU = Math.abs(Us);

      // Smoothstep: nodal region (white) near zero
      const e0 = threshold * 0.5;
      const e1 = threshold * 1.5;
      const t0 = Math.max(0, Math.min(1, (absU - e0) / (e1 - e0)));
      const nodalBlend = showNodes ? t0 * t0 * (3 - 2 * t0) : 1;
      let blend = nodalBlend;
      let opacity = 1;
      let red = (1 - nodalBlend);
      let grn = (1 - nodalBlend);
      let blu = (1 - nodalBlend);

      // Smoothstep: peak region (red) for high positive U
      const p0 = c * 0.7;
      const p1 = c * 1.3;
      const tP = (showPeaks && Us > 0) ? Math.max(0, Math.min(1, (Us - p0) / (p1 - p0))) : 0;
      const peakBlend = 1 - tP * tP * (3 - 2 * tP);
      if (peakBlend < blend) {
        blend = peakBlend;
        opacity = 2/3;
        red = (1 - peakBlend);
        grn = 0;
        blu = 0;
      }

      // Smoothstep: valley region (blue) for low negative U
      const tV = (showValleys && Us < 0) ? Math.max(0, Math.min(1, (-Us - p0) / (p1 - p0))) : 0;
      const valleyBlend = 1 - tV * tV * (3 - 2 * tV);
      if (valleyBlend < blend) {
        blend = valleyBlend;
        opacity = 2/3;
        red = 0;
        grn = 0;
        blu = (1 - valleyBlend);
      }

      data[idx + 0] = 255 * red;
      data[idx + 1] = 255 * grn;
      data[idx + 2] = 255 * blu;
      data[idx + 3] = 255 * opacity * (1 - blend);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

sliderM.addEventListener('input', () => {
  m = parseInt(sliderM.value);
  valueM.textContent = m;
  freqLabel.textContent = `Frequency: ${getFreqHz(m, n).toFixed(4)}`;
  if (oscillator) {
    oscillator.frequency.value = getFreqHz();
  }
  draw();
});

sliderN.addEventListener('input', () => {
  n = parseInt(sliderN.value);
  valueN.textContent = n;
  freqLabel.textContent = `Frequency: ${getFreqHz(m, n).toFixed(4)}`;
  if (oscillator) {
    oscillator.frequency.value = getFreqHz();
  }
  draw();
});

sliderM1.addEventListener('input', () => {
  m1 = parseInt(sliderM1.value);
  valueM1.textContent = m1;
  freqLabel1.textContent = `Frequency: ${getFreqHz(m1, n1).toFixed(4)}`;
  if (oscillator1) {
    oscillator1.frequency.value = getFreqHz();
  }
  draw();
});

sliderN1.addEventListener('input', () => {
  n1 = parseInt(sliderN1.value);
  valueN1.textContent = n1;
  freqLabel1.textContent = `Frequency: ${getFreqHz(m1, n1).toFixed(4)}`;
  if (oscillator1) {
    oscillator1.frequency.value = getFreqHz();
  }
  draw();
});

soundBtn.addEventListener('click', () => {
  if (playing) {
    oscillator = stopTone(soundBtn, oscillator);
    playing = false;
  }
  else {
    oscillator = startTone(soundBtn, m, n);
    playing = true;
  }
});

soundBtn1.addEventListener('click', () => {
  if (playing1) {
    oscillator1 = stopTone(soundBtn1, oscillator1);
    playing1 = false;
  }
  else {
    oscillator1 = startTone(soundBtn1, m1, n1);
    playing1 = true;
  }
});

sliderTheta.addEventListener('input', () => {
  thetaOffset = sliderTheta.value * Math.PI / 180;
  valueTheta.textContent = Math.round(thetaOffset * 180 / Math.PI);
  draw();
});

sliderC.addEventListener('input', () => {
  c = sliderC.value;
  console.log(c);
  valueC.textContent = parseFloat(c).toFixed(2);
  draw();
});

checkNodes.addEventListener('change', () => {
  showNodes = checkNodes.checked;
  draw();
});

checkPeaks.addEventListener('change', () => {
  showPeaks = checkPeaks.checked;
  draw();
});

checkValleys.addEventListener('change', () => {
  showValleys = checkValleys.checked;
  draw();
});

// Sync labels with restored slider values
valueM.textContent = m;
valueN.textContent = n;
valueM1.textContent = m1;
valueN1.textContent = n1;
valueTheta.textContent = sliderTheta.value;
freqLabel.textContent = `Frequency: ${getFreqHz(m, n).toFixed(4)}`;
freqLabel1.textContent = `Frequency: ${getFreqHz(m1, n1).toFixed(4)}`;

// Clear stale file input (browser remembers name but not data across refresh)
fileInput.value = '';

// --- Background image: upload, drag, scroll-to-zoom ---
let imgX = 0, imgY = 0, imgScale = 1;

function updateBgTransform() {
  bgImage.style.transform = `translate(${imgX}px, ${imgY}px) scale(${imgScale})`;
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  bgImage.onload = () => {
    // Fit image to canvas size initially
    const wrapSize = canvas.width;
    imgScale = wrapSize / Math.max(bgImage.naturalWidth, bgImage.naturalHeight);
    imgX = (wrapSize - bgImage.naturalWidth * imgScale) / 2;
    imgY = (wrapSize - bgImage.naturalHeight * imgScale) / 2;
    bgImage.style.display = 'block';
    updateBgTransform();
  };
  bgImage.src = url;
});

// Drag to move
let dragging = false, dragStartX, dragStartY, imgStartX, imgStartY;

canvas.addEventListener('mousedown', (e) => {
  dragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  imgStartX = imgX;
  imgStartY = imgY;
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  imgX = imgStartX + (e.clientX - dragStartX);
  imgY = imgStartY + (e.clientY - dragStartY);
  updateBgTransform();
});

window.addEventListener('mouseup', () => { dragging = false; });

// Scroll to zoom (centered on cursor)
canvas.addEventListener('wheel', (e) => {
  if (bgImage.style.display === 'none') return;
  e.preventDefault();
  const center = canvas.width / 2;

  const factor = e.deltaY < 0 ? 1.005 : 1 / 1.005;
  const newScale = imgScale * factor;

  // Zoom toward center
  imgX = center - (center - imgX) * factor;
  imgY = center - (center - imgY) * factor;
  imgScale = newScale;
  updateBgTransform();
}, { passive: false });

window.addEventListener('resize', resize);
resize();
