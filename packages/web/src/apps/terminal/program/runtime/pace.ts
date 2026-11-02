// How fast the runtime may tell the page anything (009 research R7, FR-009, FR-024):
// past an allowance by the clock, the program waits, as a program does on a real
// terminal, and what it wrote goes as it writes it. Nothing is ever held back, since
// a blocked loop could never send it and a stop would lose it. In Chromium, Firefox
// and WebKit 100 messages a millisecond keep the page's frames under 25 ms, and a
// flood with no limit stalls it for seconds and takes gigabytes: this is half of
// that rate, for a slower machine.
const SENDS_PER_MS = 50;
const SENDS_AT_ONCE = 2_000;
const CHARS_PER_MS = 4_000;
const CHARS_AT_ONCE = 200_000;

// Waits until a message of `chars` characters may go. A long text takes the
// allowance below nothing, so what comes after it waits for it.
export function createPace(now: () => number) {
  let sends = SENDS_AT_ONCE;
  let chars = CHARS_AT_ONCE;
  let earned = now();

  const refill = () => {
    const at = now();
    sends = Math.min(SENDS_AT_ONCE, sends + (at - earned) * SENDS_PER_MS);
    chars = Math.min(CHARS_AT_ONCE, chars + (at - earned) * CHARS_PER_MS);
    earned = at;
  };

  return (size: number): void => {
    refill();
    while (sends < 1 || chars <= 0) refill();
    sends -= 1;
    chars -= size;
  };
}
