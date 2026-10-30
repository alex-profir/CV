// The status region (005 FR-041): it announces changes that don't move
// focus, such as a window moved or maximized. The text is cleared, then set
// on the next frame, so the same message twice in a row is read twice. An
// announcement that comes before that frame joins the one waiting, so
// neither is lost (008 FR-065, FR-066).
import { useEffect, useRef, useState } from 'react';

export type Announcement = { message: string; id: number };

export function Announcer({ announcement }: { announcement: Announcement | null }) {
  const [text, setText] = useState('');
  const waiting = useRef<string | null>(null);
  const frame = useRef(0);
  useEffect(() => {
    if (announcement === null) return;
    waiting.current = waiting.current === null ? announcement.message : `${waiting.current} ${announcement.message}`;
    setText('');
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      setText(waiting.current ?? '');
      waiting.current = null;
    });
  }, [announcement]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (
    <div role="status" className="visually-hidden" data-req="005-os-shell-FR-041">
      {text}
    </div>
  );
}
