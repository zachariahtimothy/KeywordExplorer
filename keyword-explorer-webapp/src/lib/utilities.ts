export function randomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export function range(start: number, stop: number, step = 1) {
  return Array.from(
    { length: (stop - start) / step + 1 },
    (_, i) => start + i * step
  );
}
