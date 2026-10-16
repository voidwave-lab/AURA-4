/**
 * Terminal Character-Based Visualization Utilities
 * Uses Unicode Braille patterns (U+2800 to U+28FF) and Block Elements (U+2580 to U+259F)
 * for real-time oscilloscope, spectrum analyzer, and stereo phase scopes.
 */

// Braille dot bitmask mapping for a 2x4 dot matrix per character
// Col 0: dot1(0x01), dot2(0x02), dot3(0x04), dot7(0x40)
// Col 1: dot4(0x08), dot5(0x10), dot6(0x20), dot8(0x80)
const BRAILLE_DOT_MASKS: number[][] = [
  [0x01, 0x08], // row 0: dot 1, dot 4
  [0x02, 0x10], // row 1: dot 2, dot 5
  [0x04, 0x20], // row 2: dot 3, dot 6
  [0x40, 0x80], // row 3: dot 7, dot 8
];

/**
 * Renders a high-resolution time-domain waveform into multi-line Braille text.
 * @param buffer Float32Array of audio samples (-1.0 to 1.0)
 * @param cols Number of character columns in terminal
 * @param rows Number of character rows in terminal
 */
export function renderBrailleWaveform(
  buffer: Float32Array,
  cols: number = 72,
  rows: number = 10
): string[] {
  const pixelWidth = cols * 2;
  const pixelHeight = rows * 4;

  // 2D grid of Braille character codepoints (initialized to empty braille 0x2800)
  const charGrid: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0)
  );

  if (!buffer || buffer.length === 0) {
    return Array.from({ length: rows }, () => ' '.repeat(cols));
  }

  // Find a stable zero-crossing trigger point to stop jitter
  let triggerIndex = 0;
  for (let i = 0; i < Math.min(buffer.length - 2, 256); i++) {
    if (buffer[i] <= 0 && buffer[i + 1] > 0) {
      triggerIndex = i;
      break;
    }
  }

  const sampleCount = Math.min(buffer.length - triggerIndex, pixelWidth * 2);
  const step = sampleCount / pixelWidth;

  let prevY: number | null = null;

  for (let px = 0; px < pixelWidth; px++) {
    const sampleIdx = triggerIndex + Math.floor(px * step);
    const sample = buffer[sampleIdx] ?? 0;

    // Map -1.0..1.0 to 0..pixelHeight - 1 (inverted Y: top is row 0)
    // Add small headroom to prevent clipping
    const normalized = Math.max(-0.98, Math.min(0.98, sample));
    const py = Math.floor(((1 - normalized) / 2) * (pixelHeight - 1));

    // Connect lines between consecutive points for smooth trace
    const startY = prevY !== null ? Math.min(prevY, py) : py;
    const endY = prevY !== null ? Math.max(prevY, py) : py;

    for (let y = startY; y <= endY; y++) {
      const charCol = Math.floor(px / 2);
      const charRow = Math.floor(y / 4);
      const dotCol = px % 2;
      const dotRow = y % 4;

      if (charRow >= 0 && charRow < rows && charCol >= 0 && charCol < cols) {
        charGrid[charRow][charCol] |= BRAILLE_DOT_MASKS[dotRow][dotCol];
      }
    }

    prevY = py;
  }

  // Convert bitmasks to Braille unicode characters
  return charGrid.map((row) =>
    row
      .map((mask) => (mask === 0 ? ' ' : String.fromCharCode(0x2800 + mask)))
      .join('')
  );
}

/**
 * Unicode 8-level vertical blocks: ' ' to '█'
 */
const BLOCK_LEVELS = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/**
 * Renders an FFT frequency spectrum into multi-line block character bars.
 * @param freqBuffer Uint8Array of frequency bins (0 - 255)
 * @param cols Number of character columns
 * @param rows Number of character rows
 * @param peakLevels Optional array to store and display peak hold indicators
 */
export function renderBlockSpectrum(
  freqBuffer: Uint8Array,
  cols: number = 64,
  rows: number = 8,
  peakHold?: number[]
): string[] {
  if (!freqBuffer || freqBuffer.length === 0) {
    return Array.from({ length: rows }, () => ' '.repeat(cols));
  }

  // Sample or aggregate frequency bins across `cols`
  const binValues: number[] = new Array(cols).fill(0);
  const binSize = Math.max(1, Math.floor(freqBuffer.length / cols / 1.5)); // Focus on audible sub to high range

  for (let c = 0; c < cols; c++) {
    const start = c * binSize;
    let sum = 0;
    let count = 0;
    for (let b = 0; b < binSize && start + b < freqBuffer.length; b++) {
      sum += freqBuffer[start + b];
      count++;
    }
    const avg = count > 0 ? sum / count : 0;
    // Map 0..255 to 0..1 with logarithmic perceptual weighting
    const normalized = Math.min(1, Math.pow(avg / 255, 0.85));
    binValues[c] = normalized;

    if (peakHold) {
      if (peakHold[c] === undefined || normalized > peakHold[c]) {
        peakHold[c] = normalized;
      } else {
        peakHold[c] = Math.max(0, peakHold[c] - 0.02); // Gradual decay
      }
    }
  }

  // Build rows from top (highest amplitude) to bottom (lowest amplitude)
  const outputRows: string[] = [];
  const totalSubLevels = rows * 8;

  for (let r = 0; r < rows; r++) {
    // Current row's normalized range: from (rows - 1 - r) / rows to (rows - r) / rows
    const rowBottom = (rows - 1 - r) / rows;
    const rowTop = (rows - r) / rows;
    const rowHeight = 1 / rows;

    let rowStr = '';
    for (let c = 0; c < cols; c++) {
      const val = binValues[c];
      const peak = peakHold ? peakHold[c] : 0;

      // Check if peak marker falls in this row
      const isPeakHere = peak >= rowBottom && peak < rowTop;

      if (val >= rowTop) {
        rowStr += '█';
      } else if (val <= rowBottom) {
        rowStr += isPeakHere ? '▔' : ' ';
      } else {
        // Fractional block within this character cell
        const fraction = (val - rowBottom) / rowHeight;
        const blockIdx = Math.min(8, Math.max(0, Math.round(fraction * 8)));
        rowStr += BLOCK_LEVELS[blockIdx];
      }
    }
    outputRows.push(rowStr);
  }

  return outputRows;
}

/**
 * Renders a 2D Stereo Phase / Lissajous Scope (Left vs Right) in Braille characters.
 */
export function renderLissajous(
  leftBuffer: Float32Array,
  rightBuffer: Float32Array,
  cols: number = 32,
  rows: number = 16
): string[] {
  const pixelWidth = cols * 2;
  const pixelHeight = rows * 4;

  const charGrid: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0)
  );

  const len = Math.min(leftBuffer.length, rightBuffer.length, 512);

  for (let i = 0; i < len; i += 2) {
    const l = Math.max(-1, Math.min(1, leftBuffer[i]));
    const r = Math.max(-1, Math.min(1, rightBuffer[i]));

    // Map L to X (0..pixelWidth-1), R to Y (0..pixelHeight-1)
    const px = Math.floor(((l + 1) / 2) * (pixelWidth - 1));
    const py = Math.floor(((1 - r) / 2) * (pixelHeight - 1));

    const charCol = Math.floor(px / 2);
    const charRow = Math.floor(py / 4);
    const dotCol = px % 2;
    const dotRow = py % 4;

    if (charRow >= 0 && charRow < rows && charCol >= 0 && charCol < cols) {
      charGrid[charRow][charCol] |= BRAILLE_DOT_MASKS[dotRow][dotCol];
    }
  }

  return charGrid.map((row) =>
    row
      .map((mask) => (mask === 0 ? '·' : String.fromCharCode(0x2800 + mask)))
      .join('')
  );
}

/**
 * Formats a numeric value into an ASCII progress/fader bar:
 * e.g. [■■■■■■□□□□] 60% or [══════●════]
 */
export function renderAsciiSlider(
  value: number,
  min: number,
  max: number,
  width: number = 14,
  style: 'fill' | 'thumb' | 'meter' = 'thumb'
): string {
  const clamped = Math.max(min, Math.min(max, value));
  const ratio = (clamped - min) / (max - min || 1);
  const pos = Math.round(ratio * (width - 1));

  if (style === 'thumb') {
    let bar = '';
    for (let i = 0; i < width; i++) {
      if (i === pos) bar += '●';
      else bar += '─';
    }
    return `[${bar}]`;
  } else if (style === 'fill') {
    const filled = Math.round(ratio * width);
    return `[${'■'.repeat(filled)}${'□'.repeat(width - filled)}]`;
  } else {
    // meter style
    const filled = Math.round(ratio * width);
    return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
  }
}

/**
 * Renders an ASCII rotary dial representation
 */
export function renderRotaryDial(value: number, min: number, max: number): string {
  const ratio = (Math.max(min, Math.min(max, value)) - min) / (max - min || 1);
  const positions = ['◴', '◷', '◶', '◵'];
  const dialIdx = Math.min(3, Math.floor(ratio * 4));
  return positions[dialIdx];
}
