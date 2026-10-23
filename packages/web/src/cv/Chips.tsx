// Keywords and courses as bordered chips (contracts/page.md), or nothing for
// an empty list.

export function Chips({ items }: { items: readonly string[] | undefined }) {
  const shown = (items ?? []).filter((item) => item !== '');
  if (shown.length === 0) return null;
  return (
    <ul className="chips">
      {shown.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
