// The mobile shell (005 contracts/shell.md Mobile shell): the home screen,
// and over it the app open full screen, if any. Going home is the Os root's
// (`onHome`), as it uses up the history entry that opening pushed (FR-050).
import type { ShellProps } from '../../os/shell-props.ts';
import { FullScreenView } from './FullScreenView.tsx';
import { HomeScreen } from './HomeScreen.tsx';

export function Mobile(props: ShellProps & { onHome: () => void }) {
  const open = props.state.mobile.open;
  return (
    <div className="mobile" data-req="005-os-shell-FR-031 005-os-shell-FR-036 005-os-shell-FR-037">
      <main className="mobile-main">
        <HomeScreen {...props} />
        {open !== null && <FullScreenView key={open} {...props} view={open} />}
      </main>
    </div>
  );
}
