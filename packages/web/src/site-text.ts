// Every word on the pages that isn't CV content, in English, as the approved
// design sets it (FR-006, data-model.md Site text). Changing a word is one
// edit here. It holds no CV fact: the content check searches it like any
// site file.
import { deepFreeze } from './freeze.ts';

export const siteText = deepFreeze({
  // The h1 and the title when the CV document has no name (FR-023, FR-037).
  siteHeading: 'CV',
  // Between the name and the role in the title.
  titleSeparator: ' — ',
  // Section headings, by the CV document's section names.
  sections: {
    work: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    education: 'Education',
    languages: 'Languages',
    interests: 'Interests',
  },
  // Contact row labels. `website` is for `basics.url`.
  basedIn: 'Based in',
  email: 'Email',
  website: 'Website',
  // An ongoing entry's end: shown, and read by screen readers.
  present: { visible: 'Present', spoken: 'present' },
  // Read by screen readers between a start and an end date.
  to: 'to',
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  // Between a start and an end date, shown only.
  rangeSeparator: ' – ',
  // Between the parts of a location line, a list of roles or interest
  // keywords, and an education entry's study type and area.
  listSeparator: ', ',
  // Between an entry's organization details: entity, type and roles, or a
  // name and a location.
  metaSeparator: ' · ',
  // The footer's repository link.
  builtWith: 'How this page was built',
  notFound: {
    label: '404 · Not found',
    heading: "This page doesn't exist.",
    hint: 'The address may be mistyped, or the page may have moved.',
    link: 'Go to the CV',
  },
  // How a profile link's accessible name joins its network and username.
  profileLabel: '{network}: {username}',
  // The OS shell (005 design/wireframes.md Site text and Screen readers).
  // Patterns hold `{key}` placeholders, filled by `fill`.
  os: {
    // Window, app and view names.
    views: { cv: 'CV', terminal: 'Terminal', about: 'About this site' },
    // Between the app's name and the site name in the title (FR-042).
    titleSeparator: ' – ',
    // The CV app's link to /cv (FR-007).
    cvLink: 'Open as a page to print or share',
    // The status region's announcements (FR-041).
    announce: {
      moved: '{window} moved.',
      moveCancelled: 'Move cancelled.',
      resized: '{window} resized to {width} by {height}.',
      resizeCancelled: 'Resize cancelled.',
      maximized: '{window} maximized.',
      restored: '{window} restored.',
    },
  },
  // The Terminal (006 design/wireframes.md Site text, contracts/commands.md
  // Replies). Patterns hold `{key}` placeholders; a placeholder for a command
  // control, such as `{help}`, is filled with the control by the engine.
  terminal: {
    // The window title: `Terminal — ~/work`, or `Terminal — vim`.
    windowTitle: '{name} — {path}',
    vimTitle: 'vim',
    clearOutput: 'Clear output',
    commandLine: 'Command',
    // The command line's description (FR-077).
    commandLineHint: 'Tab completes. Escape then Tab leaves.',
    // A second Tab with 100 matches or more asks first (FR-076).
    completionQuestion: 'Display all {n} possibilities? (y or n)',
    prompt: { user: 'guest' },
    // The command chips the Terminal opens on, before the first prompt.
    starter: ['help', 'about', 'work', 'projects', 'cv'],
    replies: {
      unknown: '{typed}: command not found.',
      unknownRun: 'Run {help} to see them all, or try:',
      unknownRunAlone: 'Run {help} to see them all.',
      helpUnknown: 'help: no command is named {name}. Run {help} to see them all.',
      usage: '{command} takes {what}. Usage: {usage}',
      noSuchPath: '{path}: no such file or folder.',
      isFile: '{path} is a file. Try {command}.',
      isFolder: '{path} is a folder. Try {command}.',
      open: 'open takes {cv} or {about}.',
      emptySection: 'The CV lists no {section}.',
      // A line the shell stopped (FR-069, FR-075).
      stopped: {
        time: 'stopped: it ran for 5 seconds, the longest a command line runs here.',
        commands: 'stopped: it ran 10,000 commands, the most a command line runs here.',
        output: 'stopped: it printed 1 MB, the most a command line prints here.',
        cancelled: 'stopped: you pressed Ctrl+C.',
      },
      // After a line cancelled with Ctrl+C.
      cancelMark: '^C',
    },
    // The shell, loaded when the Terminal first opens (FR-070).
    shellLoading: 'loading the shell · type away, commands run once it is ready',
    shellFailed: "The shell couldn't load. Check the connection, then try again.",
    tryAgain: 'try again',
    // The status region (FR-028, FR-065).
    announce: {
      summary: '{command}: {count} {unit}',
      units: {
        entries: { one: 'entry', other: 'entries' },
        commands: { one: 'command', other: 'commands' },
        files: { one: 'file', other: 'files' },
        lines: { one: 'line', other: 'lines' },
        specs: { one: 'spec', other: 'specs' },
      },
      cd: 'Now in {path}',
      cleared: 'Cleared',
      cancelled: 'Cancelled',
      loading: 'Loading the shell',
      vimOpened: { plain: '{file}, {n} lines. Type :q to leave.', readonly: '{file}, read only, {n} lines. Type :q to leave.', new: '{file}, new, {n} lines. Type :q to leave.' },
      possibilities: '{n} possibilities',
    },
    vim: {
      labels: { plain: '{file}', readonly: '{file}, read only', new: '{file}, new' },
      roleDescription: 'vim view',
      readOnlyMark: '[RO]',
      modes: { normal: 'NORMAL', insert: '-- INSERT --', help: 'HELP' },
      modifiedMark: '[+]',
      noName: '[No Name]',
      positions: { top: 'Top', bottom: 'Bot', all: 'All' },
      fold: '+-- {n} lines: "{key}": {bracket} ',
      // The message line (contracts/commands.md The vim view's keys).
      openings: { plain: '"{file}" {n} lines', readonly: '"{file}" [readonly] {n} lines', new: '"{file}" [New]', piped: '"{file}" {n} lines' },
      foldHint: { desktop: '  ·  za or click opens a fold', phone: '  ·  tap a fold' },
      written: '"{file}" {new}{n}L, {b}B written',
      writtenNew: '[New] ',
      // vim's own messages, word for word (FR-060, FR-080, FR-081).
      messages: {
        W10: 'W10: Warning: Changing a readonly file',
        E13: 'E13: File exists (add ! to override)',
        E32: 'E32: No file name',
        E37: 'E37: No write since last change (add ! to override)',
        E45: "E45: 'readonly' option is set (add ! to override)",
        E212: '"{path}" E212: Can\'t open file for writing',
        E492: 'E492: Not an editor command: {typed}',
        E514: '"{path}" E514: Write error (file system full?)',
        oldest: 'Already at oldest change',
        newest: 'Already at newest change',
      },
      match: '/{text}   match {index} of {count}  ·  n next  ·  N previous',
      notFound: '/{text}   not found',
      entry: { '/': 'Search', ':': 'Command' },
      chips: { help: ':help', quit: ':q' },
      helpName: 'keys',
      keysHeading: 'KEYS FOR {file}',
      keysSuffix: { piped: ' · :w <path> writes it to a file', readonly: ' · read only: :w <path> keeps a copy' },
      helpRows: [
        { label: 'Move', keys: ['h j k l or arrows', 'w b word', '0 $ line start, end', 'gg G top, bottom', '{ } previous, next section', 'PgUp PgDn'] },
        { label: 'Search', keys: ['/text then Enter', 'n N next, previous match'] },
        { label: 'Folds', keys: ['za open or close', 'zR open all', 'zM close all'] },
        { label: 'Lines', keys: [':12 go to line 12', ':set nu / :set nonu'] },
        { label: 'Insert', keys: ['i a I A o O type text', 'Esc back to normal'] },
        { label: 'Edit', keys: ['x dd dw D delete', 'cw cc C change', 'r replace', 'J join', 'yy yw copy', 'p P paste', 'u undo', ':redo redo', '. repeat'] },
        { label: 'Write', keys: [':w write', ':w path write to a path', ':wq :x ZZ write and leave'] },
        { label: 'Leave', keys: [':q back to the Terminal', ':q! leave without writing', 'Tab moves focus out; in insert mode, Esc then Tab'] },
      ],
      keysNote: 'A count goes first: 3dd deletes three lines. On a Mac, Ctrl+R redoes too. Folds and the cursor can be clicked or tapped.',
    },
    pocket: {
      brand: 'cv-os pocket',
      vimBrand: 'cv-os pocket · vim keys',
      commandKeys: 'Command keys',
      vimKeys: 'Vim keys',
      // A vim key's name: the key it shows, then what it does, so the
      // name starts with the key's own text (WCAG 2.5.3).
      vimKeyName: '{key}, {name}',
      commands: ['help', 'about', 'work', 'projects', 'cv', 'ls', 'clear'],
      tabKey: { key: 'Tab', name: 'Tab, complete' },
      escKey: { key: 'Esc', name: 'Esc, back to normal mode' },
      vim: [
        { key: 'j', name: 'Down' },
        { key: 'k', name: 'Up' },
        { key: 'za', name: 'Open or close fold' },
        { key: '/', name: 'Search' },
        { key: 'n', name: 'Next match' },
        { key: 'gg', name: 'Top' },
        { key: 'G', name: 'Bottom' },
        { key: 'i', name: 'Insert' },
        { key: 'u', name: 'Undo' },
        { key: ':w', name: 'Write' },
        { key: ':q', name: 'Quit' },
      ],
    },
  },
  desktop: {
    menuBar: 'Menu bar',
    area: 'Desktop',
    dock: 'Dock',
    siteMenu: 'Site menu',
    siteMenuItems: { about: 'About this site', cvPage: 'Open the CV as a page', source: 'Source code on GitHub' },
    windowMenu: 'Window',
    goToMenuBar: 'Go to the menu bar',
    goToDock: 'Go to the dock',
    nextWindow: 'Next window',
    minimizedNote: '(minimized)',
    // The focused window's own menu.
    ownMenu: {
      cvPage: 'Open the CV as a page',
      move: 'Move…',
      resize: 'Resize…',
      minimize: 'Minimize',
      maximize: 'Maximize',
      restore: 'Restore',
      close: 'Close',
    },
    controls: {
      close: 'Close {window}',
      minimize: 'Minimize {window}',
      maximize: 'Maximize {window}',
      restore: 'Restore {window}',
    },
    // A dock item's name, with its state when it has one (FR-011).
    dockItem: '{app}, {state}',
    dockStates: { open: 'open', minimized: 'minimized' },
    // The move and resize pad (FR-020, FR-062). The step sizes come from
    // the metrics, so they stay design values.
    pad: {
      moving: 'Moving {window}',
      resizing: 'Resizing {window}',
      up: 'Up',
      down: 'Down',
      left: 'Left',
      right: 'Right',
      narrower: 'Narrower',
      wider: 'Wider',
      shorter: 'Shorter',
      taller: 'Taller',
      done: 'Done',
      cancel: 'Cancel',
      step: 'Arrows: {step} px',
      bigStep: 'Shift+arrows: {bigStep} px',
    },
    // The title bar during a move or resize, in place of the controls.
    mode: { move: 'Moving', resize: 'Resizing' },
  },
  mobile: {
    home: 'Home',
    homeScreen: 'Home screen',
    about: 'About this site',
  },
  about: {
    heading: 'About this site',
    paragraph:
      "This is {name}'s CV, presented as a small operating system that runs in the browser. It was built spec first: every feature has a public spec, a reviewed design and tests that trace back to its requirements.",
    cvPage: 'Open the CV as a page',
    source: 'Source code, specs and history on GitHub',
    shortcutsHeading: 'Keyboard shortcuts',
    // By shortcut id, in data-model.md's Shortcuts order.
    commands: {
      'menu-bar': 'Go to the menu bar',
      dock: 'Go to the dock',
      'next-window': 'Next window',
      close: 'Close window',
      minimize: 'Minimize window',
      maximize: 'Maximize or restore window',
      move: 'Move window',
      resize: 'Resize window',
    },
    notes: ['On a Mac, use Option+Shift in place of Alt+Shift.', 'In menus and the dock, use the arrow keys, Enter and Escape.'],
  },
  // The requirement inspector (007 design/wireframes.md Site text and Screen
  // readers). `{view}` is a view's name; the page title follows 005's
  // `os.titleSeparator` rule.
  inspector: {
    show: 'Show specs',
    showShort: 'Specs',
    showName: 'Show specs for {view}',
    back: 'Back to {view}',
    windowTitle: '{view} · Specs',
    headerSuffix: 'Specs',
    region: '{view} specs',
    heading: 'Specs for {view}',
    // About this site's view lists the shell's own requirements.
    shellName: 'the shell',
    ledeApp: 'Every requirement the {view} app implements, grouped by spec. Each one links to its line in the spec and to the tests that check it.',
    ledeShell:
      "Every requirement the shell itself implements: the menu bar, the dock, the windows' frames and controls, the home screen, and these spec controls. Each one links to its line in the spec and to the tests that check it.",
    requirements: { one: '1 requirement', other: '{n} requirements' },
    specs: { one: '1 spec', other: '{n} specs' },
    builtFrom: 'built from',
    // Between the build line's parts.
    separator: ' · ',
    notShown: { one: "1 more requirement in this spec isn't shown here", other: "{n} more requirements in this spec aren't shown here" },
    openSpec: 'Open the spec',
    approved: 'Approved',
    draft: 'Draft',
    // A spec's heading as it is read: the status as written, after a comma.
    groupName: '{number} {title}, {status}',
    inTheSpec: 'In the spec, line {line}',
    // A reference's name: its text as written, then the full ID.
    refName: '{text}, {id}',
    tests: 'Tests',
    testsCount: 'Tests, {n}',
    noTests: 'No test covers this yet.',
    // A test whose title is built when it runs, so the data has no name.
    unnamedTest: 'A test named when it runs',
    whatsThis: {
      button: "What's this?",
      heading: "What's this?",
      paragraphs: [
        'This site is built spec first. Every feature starts as a spec in the site\'s repository: a list of numbered requirements, each one thing the site must do. Every part of the interface that meets a requirement carries its ID, and every test that checks it names the ID too. A check on every pull request makes sure nothing ships without both.',
        "This view lists the requirements this app's interface carries, read from the repository when the site was built, with a link to each one in its spec and to the tests that check it.",
      ],
      chain: ['Feature', 'Spec', 'Requirement FR-###', 'Interface', 'Tests'],
      // Between the chain's labels, shown only.
      chainArrow: ' › ',
      chainSpoken: 'Feature, then Spec, then Requirement, then Interface, then Tests',
      repository: "The site's repository on GitHub",
    },
    offline: "You're offline. Everything here is saved on this device, but the links to GitHub need a connection.",
    uncommitted: 'This build includes uncommitted changes. Its links lead to the last commit, {commit}, so they may not match what you see here.',
  },
  // The root without scripts (FR-049).
  noScript: {
    sentence: 'This site is a small operating system that runs in your browser, and it needs JavaScript. The CV reads in full without it.',
    link: 'Read the CV',
  },
});

// A pattern with each `{key}` replaced by its value, so a phrase holding a
// name, a size or a step is written once (FR-043).
export function fill(pattern: string, values: Record<string, string | number>): string {
  return pattern.replace(/\{(\w+)\}/g, (match, key: string) => (Object.hasOwn(values, key) ? String(values[key]) : match));
}

// A counted phrase's form for `n`: English says 1 in the singular (FR-028).
export const counted = (forms: { one: string; other: string }, n: number): string => (n === 1 ? forms.one : forms.other);

export type SiteText = typeof siteText;
