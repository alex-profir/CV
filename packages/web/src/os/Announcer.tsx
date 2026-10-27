// The status region (005 FR-041): it announces changes that don't move
// focus, such as a window moved or maximized. The text is cleared, then set
// on the next frame, so the same message twice in a row is read twice.
import { useEffect, useState } from 'react';

export type Announcement = { message: string; id: number };

export function Announcer({ announcement }: { announcement: Announcement | null }) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (announcement === null) return undefined;
    setText('');
    const frame = requestAnimationFrame(() => setText(announcement.message));
    return () => cancelAnimationFrame(frame);
  }, [announcement]);
  return (
    <div role="status" className="visually-hidden" data-req="005-os-shell-FR-041">
      {text}
    </div>
  );
}
