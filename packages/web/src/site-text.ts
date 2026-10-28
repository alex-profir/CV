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
    views: { cv: 'CV', about: 'About this site' },
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

export type SiteText = typeof siteText;
