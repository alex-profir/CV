// The compiler options panel (FR-024 to FR-026), in place of the panes: the
// design's groups as fieldsets, a select for `target`, a checkbox per flag
// with its name in code and its description as the control's description.
// A change applies at once. `strict` sets its checks; each can then be set
// on its own. Escape closes the panel and gives focus back to Options.
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { counted, fill, siteText } from '../../site-text.ts';
import { setOptions } from './controller.ts';
import { CloseGlyph } from './Glyphs.tsx';
import { OPTIONS, changedOptions, differingNames, settle, withStrict } from './options.ts';
import type { DescribedOption, OptionGroup, Target } from './options.ts';
import { session, useSession } from './session.ts';
import { focusOptionsButton } from './Toolbar.tsx';

const words = siteText.playground.options;

const GROUPS: readonly OptionGroup[] = ['language', 'strict', 'checks', 'output'];

// Set when the panel opens from Options or the menu, so its first control
// takes focus; a panel shown again after Show specs leaves focus alone.
let focusOnOpen = false;

export function openOptionsPanel(): void {
  focusOnOpen = true;
  session.update({ panel: 'options' });
}

export function closeOptionsPanel(): void {
  session.update({ panel: 'none' });
  requestAnimationFrame(focusOptionsButton);
}

const controlId = (name: string) => `playground-option-${name}`;
const descriptionId = (name: string) => `playground-option-${name}-description`;

function OptionRow({ option, value }: { option: DescribedOption; value: boolean | Target }) {
  const changed = session.get().options;
  if (option.kind === 'choice') {
    return (
      <div className="option select-row">
        <label htmlFor={controlId(option.name)}>
          <code>{option.name}</code>
        </label>
        <select id={controlId(option.name)} className="select" value={value as Target} aria-describedby={descriptionId(option.name)} onChange={(event) => setOptions({ ...changed, target: event.target.value as Target })}>
          {option.values.map((target) => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
        <span className="option-description" id={descriptionId(option.name)}>
          {option.description}
        </span>
      </div>
    );
  }
  const toggle = (checked: boolean) => setOptions(option.name === 'strict' ? withStrict(changed, checked) : changedOptions({ ...settle(changed), [option.name]: checked }));
  return (
    <div className={option.underStrict ? 'option is-sub' : 'option'}>
      {/* The box is drawn 16 px; its label around it is the 24 px target (FR-067). */}
      <label className="option-box">
        <input type="checkbox" id={controlId(option.name)} checked={value as boolean} aria-describedby={descriptionId(option.name)} onChange={(event) => toggle(event.target.checked)} />
      </label>
      <span className="option-text">
        <label htmlFor={controlId(option.name)}>
          <code>{option.name}</code>
        </label>
        <span id={descriptionId(option.name)}>{option.description}</span>
      </span>
    </div>
  );
}

export function OptionsPanel() {
  const options = useSession((state) => state.options);
  const values = settle(options);
  const panel = useRef<HTMLElement>(null);
  const names = differingNames(options);
  useEffect(() => {
    if (!focusOnOpen) return;
    focusOnOpen = false;
    panel.current?.querySelector<HTMLElement>('select, input')?.focus();
  }, []);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    closeOptionsPanel();
  };
  return (
    <section ref={panel} className="options-panel" aria-labelledby="playground-options-heading" onKeyDown={onKeyDown} data-req="008-typescript-playground-FR-024 008-typescript-playground-FR-025 008-typescript-playground-FR-026">
      <div className="options-head">
        <h2 id="playground-options-heading">{words.heading}</h2>
        <button type="button" className="text-button options-defaults" onClick={() => setOptions({})}>
          {words.defaults}
        </button>
        <button type="button" className="icon-button" aria-label={words.close} onClick={closeOptionsPanel}>
          <CloseGlyph />
        </button>
      </div>
      <div className="options-body">
        {GROUPS.map((group) => (
          <fieldset key={group}>
            <legend>{words.groups[group]}</legend>
            {OPTIONS.filter((option) => option.group === group).map((option) => (
              <OptionRow key={option.name} option={option} value={values[option.name]} />
            ))}
          </fieldset>
        ))}
      </div>
      <p className="options-foot">{names.length === 0 ? words.changedNone : fill(counted(words.changed, names.length), { names: names.join(', ') })}</p>
    </section>
  );
}
