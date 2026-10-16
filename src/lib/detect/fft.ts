// Radix-2 Cooley–Tukey FFT utilities used by the media forensics engines.

/** In-place iterative FFT on interleaved complex data [re0, im0, re1, im1, ...]. n must be a power of 2. */
export function fft(data: Float64Array, n: number, inverse = false): void {
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = data[2 * i], ti = data[2 * i + 1];
      data[2 * i] = data[2 * j];
      data[2 * i + 1] = data[2 * j + 1];
      data[2 * j] = tr;
      data[2 * j + 1] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((2 * Math.PI) / len) * (inverse ? 1 : -1);
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = data[2 * (i + j)], ui = data[2 * (i + j) + 1];
        const vr = data[2 * (i + j + len / 2)] * cwr - data[2 * (i + j + len / 2) + 1] * cwi;
        const vi = data[2 * (i + j + len / 2)] * cwi + data[2 * (i + j + len / 2) + 1] * cwr;
        data[2 * (i + j)] = ur + vr;
        data[2 * (i + j) + 1] = ui + vi;
        data[2 * (i + j + len / 2)] = ur - vr;
        data[2 * (i + j + len / 2) + 1] = ui - vi;
        const nwr = cwr * wr - cwi * wi;
        cwi = cwr * wi + cwi * wr;
        cwr = nwr;
      }
    }
  }
  if (inverse) for (let i = 0; i < 2 * n; i++) data[i] /= n;
}

/** 2D power spectrum of a square grayscale patch (n x n, n power of 2). Returns fftshifted power grid normalized to [0,1]. */
export function powerSpectrum2D(gray: Float64Array, n: number): Float64Array {
  const buf = new Float64Array(2 * n * n);
  // rows
  const row = new Float64Array(2 * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      row[2 * x] = gray[y * n + x];
      row[2 * x + 1] = 0;
    }
    fft(row, n);
    for (let x = 0; x < n; x++) {
      buf[2 * (y * n + x)] = row[2 * x];
      buf[2 * (y * n + x) + 1] = row[2 * x + 1];
    }
  }
  // cols
  const col = new Float64Array(2 * n);
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      col[2 * y] = buf[2 * (y * n + x)];
      col[2 * y + 1] = buf[2 * (y * n + x) + 1];
    }
    fft(col, n);
    for (let y = 0; y < n; y++) {
      buf[2 * (y * n + x)] = col[2 * y];
      buf[2 * (y * n + x) + 1] = col[2 * y + 1];
    }
  }
  // power + log compress + fftshift
  const out = new Float64Array(n * n);
  let max = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const re = buf[2 * (y * n + x)], im = buf[2 * (y * n + x) + 1];
      const p = Math.log1p(re * re + im * im);
      const sy = (y + n / 2) % n, sx = (x + n / 2) % n;
      out[sy * n + sx] = p;
      if (p > max) max = p;
    }
  }
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] /= max;
  return out;
}

/** Magnitude spectrum of a real audio frame (zero-padded to n). Returns magnitudes for bins 0..n/2. */
export function magnitudeSpectrum(frame: Float64Array, n: number): Float64Array {
  const buf = new Float64Array(2 * n);
  for (let i = 0; i < Math.min(frame.length, n); i++) buf[2 * i] = frame[i];
  fft(buf, n);
  const out = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(buf[2 * i], buf[2 * i + 1]);
  return out;
}
