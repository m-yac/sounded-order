import './style.css';
import BESSEL from 'bessel';
import { BESSEL_ZEROS } from './bessel_zeros.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const sliderM = document.getElementById('slider-m');
const sliderN = document.getElementById('slider-n');
const sliderTheta = document.getElementById('slider-theta');
const valueM = document.getElementById('value-m');
const valueN = document.getElementById('value-n');
const valueTheta = document.getElementById('value-theta');
const checkPeaks = document.getElementById('check-peaks');
const checkValleys = document.getElementById('check-valleys');
const freqLabel = document.getElementById('freq-label');

// alpha(m, n) returns the nth zero of J_m (n is 1-indexed)
function alpha(m, n) {
  return BESSEL_ZEROS[m][n - 1];
}

// Current mode (init from slider values in case browser restores them)
let m = parseInt(sliderM.value);
let n = parseInt(sliderN.value);
let thetaOffset = parseInt(sliderTheta.value) * Math.PI / 180;
let showPeaks = checkPeaks.checked;
let showValleys = checkValleys.checked;

function updateFreqLabel() {
  freqLabel.textContent = `Frequency: ${alpha(m, n).toFixed(4)}`;
}

function resize() {
  // Reserve space for controls below (sliders ~80px + margins)
  const controlsHeight = 180;
  const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - controlsHeight - 40);
  const size = Math.max(100, maxSize);
  canvas.width = size;
  canvas.height = size;
  draw();
}

function draw() {
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 10;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const a = alpha(m, n);
  const threshold = 0.01;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = dist / radius;

      const idx = (py * width + px) * 4;

      if (r > 1) {
        // Smoothstep: outer nodal boundary (white)
        const e0 = threshold * 0.5;
        const e1 = threshold * 1.5;
        const t0 = Math.max(0, Math.min(1, ((r-1) - e0) / (e1 - e0)));
        const nodalBlend = t0 * t0 * (3 - 2 * t0);
        data[idx + 0] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255 * (1 - nodalBlend);
        continue;
      }

      const theta = Math.atan2(dy, dx);
      const U = BESSEL.besselj(a * r, m) * (Math.cos(thetaOffset) * Math.cos(m * theta) + Math.sin(thetaOffset) * Math.sin(m * theta));

      const absU = Math.abs(U);

      // Smoothstep: nodal region (white) near zero
      const e0 = threshold * 0.5;
      const e1 = threshold * 1.5;
      const t0 = Math.max(0, Math.min(1, (absU - e0) / (e1 - e0)));
      const nodalBlend = t0 * t0 * (3 - 2 * t0);
      let blend = nodalBlend;
      let opacity = 1;
      let red = (1 - nodalBlend);
      let grn = (1 - nodalBlend);
      let blu = (1 - nodalBlend);

      // Smoothstep: peak region (red) for high positive U
      const peakThreshold = 0.1;
      const p0 = peakThreshold * 0.7;
      const p1 = peakThreshold * 1.3;
      const tP = (showPeaks && U > 0) ? Math.max(0, Math.min(1, (U - p0) / (p1 - p0))) : 0;
      const peakBlend = 1 - tP * tP * (3 - 2 * tP);
      if (peakBlend < blend) {
        blend = peakBlend;
        opacity = 2/3;
        red = (1 - peakBlend);
        grn = 0;
        blu = 0;
      }

      // Smoothstep: valley region (blue) for low negative U
      const tV = (showValleys && U < 0) ? Math.max(0, Math.min(1, (-U - p0) / (p1 - p0))) : 0;
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
  updateFreqLabel();
  draw();
});

sliderN.addEventListener('input', () => {
  n = parseInt(sliderN.value);
  valueN.textContent = n;
  updateFreqLabel();
  draw();
});

sliderTheta.addEventListener('input', () => {
  thetaOffset = sliderTheta.value * Math.PI / 180;
  valueTheta.textContent = Math.round(thetaOffset * 180 / Math.PI);
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
valueTheta.textContent = sliderTheta.value;
updateFreqLabel();

window.addEventListener('resize', resize);
resize();
