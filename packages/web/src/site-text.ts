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
    views: { cv: 'CV', terminal: 'Terminal', playground: 'Playground', about: 'About this site' },
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
    prompt: { user: 'guest' },
    greeting: {
      desktop: {
        status: 'cv-os terminal · read only · nothing you type leaves your browser',
        intro: 'This is my CV as a terminal. Type a command and press Enter, or pick one to start. New here? Try {help}.',
      },
      phone: {
        status: 'read only · stays in your browser',
        statusNarrow: 'read only · in your browser',
        intro: 'My CV as a terminal. Tap a key below, or type a command. New? Try {help}.',
      },
      name: '{name} — {label}',
      // A CV with a name and no label.
      nameAlone: '{name}',
      commands: ['help', 'about', 'work', 'projects', 'cv'],
    },
    // By command name, in `help`'s order: the arguments `help` shows after
    // the name, the one-line description and the command's own help.
    commands: {
      help: { args: '[command]', description: "Every command, or one command's own help", help: 'Lists every command with what it does. Give a command, such as help work, to read its own help.' },
      about: { args: '', description: 'Name, role, location and summary', help: "Shows the CV's basics: the name, the role, the location and the summary." },
      work: { args: '', description: 'Every role', help: 'Shows every role in the CV, in its order: the position and organization, the dates, the location, the summary and the highlights.' },
      projects: { args: '', description: 'Every project', help: 'Shows every project in the CV: its name, dates, description, highlights, keywords and link.' },
      education: { args: '', description: 'Every school and degree', help: 'Shows every school in the CV: the institution, the study type and area, the dates, the score and the courses.' },
      skills: { args: '', description: 'Every skill with its level and keywords', help: 'Shows every skill in the CV with its level and keywords.' },
      languages: { args: '', description: 'Every language with its fluency', help: 'Shows every language in the CV with its fluency.' },
      interests: { args: '', description: 'Every interest', help: 'Shows every interest in the CV with its keywords.' },
      contact: { args: '', description: 'Email, website and profiles', help: 'Shows the email address, the website and every profile, as links.' },
      cv: { args: '', description: "The CV's JSON in vim: cat cv.json | jq | vim -", help: 'Opens the whole CV as JSON in a read-only vim view, by running cat cv.json | jq | vim -. Type :q to come back.' },
      site: { args: '', description: 'What this site is and how it was built', help: 'Says what this site is and how it was built, with a link to its source code.' },
      specs: { args: '', description: "The site's feature specs", help: 'Lists every feature spec the site was built from, with its status and its number of requirements.' },
      ls: { args: '[path]', description: 'List a folder', help: 'Lists the folder you are in, or the folder or file a path names. Click a name to open it.' },
      cd: { args: '[path]', description: 'Change folder. cd alone goes home', help: 'Changes the folder you are in. cd .. goes up, and cd alone goes back to the home folder, ~.' },
      cat: { args: '<path>', description: 'Show a file', help: 'Shows a file. cat cv.json shows the whole CV as JSON.' },
      jq: { args: '[path]', description: 'Pretty-print JSON', help: 'Pretty-prints JSON, from a path or from what is piped in, such as cat cv.json | jq.' },
      vim: { args: '[path | -]', description: 'Read a file in vim. - reads what is piped in', help: 'Opens a file in a read-only vim view. vim - reads what is piped in. Type :help there for its keys, and :q to leave.' },
      pwd: { args: '', description: 'Show the current folder', help: 'Shows the path of the folder you are in.' },
      open: { args: '<name>', description: 'Open cv, playground or about in the shell', help: 'Opens the CV app with open cv, the Playground with open playground, or About this site with open about.' },
      history: { args: '', description: 'Commands run so far', help: 'Lists the commands run since the Terminal opened, oldest first. The Up and Down arrows step through them.' },
      clear: { args: '', description: 'Clear the screen', help: 'Clears the output. The commands stay in the history.' },
      exit: { args: '', description: 'Close the Terminal', help: 'Closes the Terminal on a computer, or goes back to the home screen on a phone.' },
    },
    // `help`'s lead, before the table.
    helpLead: { desktop: 'Click a command to run it, or type it and press Enter.', phone: 'Tap a command to run it.' },
    // What a command takes, by its kind of arguments, for the usage reply.
    takes: {
      none: 'no arguments',
      'optional-path': 'at most one path',
      path: 'one path',
      'optional-command': 'at most one command',
      name: 'one name, cv or about',
      'path-or-input': 'one path, or - with piped input',
      'optional-path-or-input': 'at most one path, or piped input',
    },
    replies: {
      unknown: '{typed} is not a command.',
      unknownRun: 'Run {help} to see them all, or try:',
      unknownRunAlone: 'Run {help} to see them all.',
      usage: '{command} takes {what}. Usage: {usage}',
      noSuchPath: '{path}: no such file or folder.',
      isFile: '{path} is a file. Try {command}.',
      isFolder: '{path} is a folder. Try {command}.',
      open: 'open takes {cv}, {playground} or {about}.',
      jqNotJson: 'jq: {source} is not JSON.',
      jqFilter: 'jq here only pretty-prints. Usage: jq [path], or … | jq',
      noInput: "{command} doesn't read piped input. Pipe into jq or vim -.",
      pipeUsage: 'Usage: {command} | jq, or {command} | vim -',
      pipeExample: 'cat cv.json',
      emptySection: 'The CV lists no {section}.',
    },
    // The section names in the empty-section reply where 004's section
    // headings don't name them.
    emptyNames: { about: 'basics', contact: 'contact details' },
    // A file's name when its entry's name gives none (FR-044).
    singular: { work: 'role', projects: 'project', education: 'school' },
    site: {
      paragraphs: [
        'This site is a CV presented as a small operating system that runs in the browser. The CV app opens first, and this Terminal reads the same CV by typing.',
        'It was built spec first: every feature has a public spec, a reviewed design, a plan and tasks, and every requirement is traced from its spec to the interface and to a test that checks it on every pull request.',
      ],
      source: 'Source code, specs and history:',
    },
    specs: {
      // Each counted phrase has its form for 1 and for any other count.
      lead: { one: 'Every feature is specified before it is built. {n} spec:', other: 'Every feature is specified before it is built. {n} specs:' },
      tail: 'All specs, plans and history:',
      link: '{repository}/blob/main/specs/{folder}/spec.md',
      requirements: { one: '{n} requirement', other: '{n} requirements' },
      statuses: { Approved: 'Approved', Draft: 'Draft', Invalid: 'Invalid' },
    },
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
      vim: '{file}, read only, {n} lines. Type :q to leave.',
    },
    vim: {
      label: '{file} (read only)',
      roleDescription: 'vim view',
      readOnlyMark: '[RO]',
      modes: { normal: 'NORMAL', help: 'HELP' },
      positions: { top: 'Top', bottom: 'Bot', all: 'All' },
      fold: '+-- {n} lines: "{key}": {bracket} ',
      // The message line (contracts/commands.md The vim view's keys).
      opened: { desktop: '"{file}" [readonly] {n} lines  ·  za or click opens a fold', phone: '"{file}" {n} lines  ·  tap a fold' },
      readOnly: '{file} is read only: nothing can be changed',
      unknown: ':{typed} is not a command here. :help lists the keys.',
      match: '/{text}   match {index} of {count}  ·  n next  ·  N previous',
      notFound: '/{text}   not found',
      entry: { '/': 'Search', ':': 'Command' },
      chips: { help: ':help', quit: ':q' },
      helpName: 'keys',
      helpHeading: 'KEYS FOR {file} · the file is read only',
      helpRows: [
        { label: 'Move', keys: ['h j k l or arrows', 'w b word', '0 $ line start, end', 'gg G top, bottom', '{ } previous, next section', 'PgUp PgDn'] },
        { label: 'Search', keys: ['/text then Enter', 'n N next, previous match'] },
        { label: 'Folds', keys: ['za open or close', 'zR open all', 'zM close all'] },
        { label: 'Lines', keys: [':12 go to line 12', ':set nu / :set nonu'] },
        { label: 'Leave', keys: [':q back to the Terminal', 'Tab moves focus out'] },
      ],
      helpNote: "i, a, o, x, dd and :w can't change the file. Folds and the cursor can be clicked or tapped too.",
    },
    pocket: {
      brand: 'cv-os pocket',
      vimBrand: 'cv-os pocket · vim keys',
      commandKeys: 'Command keys',
      vimKeys: 'Vim keys',
      // A vim key's name: the key it shows, then what it does, so the
      // name starts with the key's own text (WCAG 2.5.3).
      vimKeyName: '{key}, {name}',
      commands: ['help', 'about', 'work', 'projects', 'skills', 'cv', 'ls', 'clear'],
      vim: [
        { key: 'j', name: 'Down' },
        { key: 'k', name: 'Up' },
        { key: 'za', name: 'Open or close fold' },
        { key: '/', name: 'Search' },
        { key: 'n', name: 'Next match' },
        { key: 'gg', name: 'Top' },
        { key: 'G', name: 'Bottom' },
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
  // The Playground (008 design/wireframes.md, states and Site text). The
  // examples' titles, descriptions and comments live in each example's module
  // (FR-031). Numbers that are design or spec values arrive through `fill`.
  playground: {
    label: 'Playground',
    loading: {
      downloading: 'Downloading TypeScript',
      progressName: 'TypeScript download',
      progress: '{received} MB of {total} MB',
      downloadingText: 'The Playground downloads TypeScript the first time it opens. After that it opens at once, offline too.',
      offline: 'TypeScript needs one download',
      offlineText: "The Playground runs TypeScript in your browser, and downloads it once, with a connection: {total} MB. You're offline, so the download starts by itself when you're back online.",
      stopped: 'The download stopped',
      stoppedText: "TypeScript arrived only in part, so the Playground won't use it. It needs one whole download with a connection: {total} MB. The download starts again by itself when you're back online, or now with Retry.",
      wontOpen: "TypeScript won't open",
      wontOpenText: "The Playground has TypeScript but couldn't start it. Retry downloads it again with a connection: {total} MB.",
      retry: 'Retry',
    },
    failed: {
      heading: 'The Playground stopped showing',
      text: "Something went wrong while showing the Playground. The rest of the site still works, and your code is safe. Try again clears the logs.",
      retry: 'Try again',
    },
    tools: {
      label: 'Playground tools',
      run: 'Run',
      stop: 'Stop',
      examples: 'Examples',
      options: 'Options',
      share: 'Share',
      shareWith: 'Share with…',
    },
    // The toolbar's run state (FR-036), and the end notes in the logs.
    runState: {
      running: { one: 'Running · {n} timer left · {s} s', other: 'Running · {n} timers left · {s} s' },
      runningIdle: 'Running · {s} s',
      blocked: 'Running · {s} s without a pause',
      finished: 'Finished in {s} s',
      stopped: 'Stopped after {s} s',
      errors: { one: 'Ended with {n} uncaught error after {s} s', other: 'Ended with {n} uncaught errors after {s} s' },
      crashed: 'Stopped unexpectedly after {s} s',
      outOfMemory: 'Ran out of memory after {s} s',
      nothingRan: 'Nothing ran',
    },
    panes: {
      label: 'Panes',
      javascript: 'JavaScript',
      declarations: 'Declarations',
      errors: 'Errors',
      logs: 'Logs',
      javascriptCaption: 'What TypeScript compiles the code to · {target} · read only',
      declarationsCaption: 'The type declarations of the code · read only',
      errorsCaption: { one: '{n} error · with the current options', other: '{n} errors · with the current options' },
      waiting: { one: 'Waiting on {n} timer', other: 'Waiting on {n} timers' },
      noErrors: 'No errors. The code checks with the current options.',
      noDeclarations: 'No declarations: {option} is off in Compiler options.',
      noJavaScript: 'No JavaScript: {option} is on and the code has errors.',
      noDeclarationsOnError: 'No declarations: {option} is on and the code has errors.',
      noLogs: 'Nothing logged yet. Run the code to see what it logs.',
    },
    logs: {
      levels: { log: 'log', info: 'info', warn: 'warn', error: 'error', debug: 'debug', alert: 'alert', note: 'note' },
      alertPrefix: 'alert:',
      dropped: { one: '{n} earlier entry was dropped. The logs keep the latest {limit}.', other: '{n} earlier entries were dropped. The logs keep the latest {limit}.' },
      cut: '… cut at {limit} characters',
      line: 'line {n}',
      lineName: 'Go to line {n}',
      noErrors: 'No errors in the code. Running.',
      errorsNote: { one: 'The code has {n} error. Running the JavaScript anyway.', other: 'The code has {n} errors. Running the JavaScript anyway.' },
      nothingRan: 'Nothing ran: {option} is on and the code has errors.',
      cantRead: { one: "Nothing ran: the code has {n} error, and its JavaScript can't be read.", other: "Nothing ran: the code has {n} errors, and its JavaScript can't be read." },
      prompt: "{name} isn't available in the Playground, so it returned null.",
      confirm: "{name} isn't available in the Playground, so it returned false.",
      closed: 'The code closed its own worker with close(), so the run ended.',
      more: '… {n} more',
      circular: '[circular]',
      deep: '[…]',
      functionName: 'function {name}',
      className: 'class {name}',
      anonymous: '(anonymous)',
    },
    // The one-line messages under the toolbar (data-model.md Message).
    messages: {
      linkCopied: { none: 'Link copied. It holds this code. Opening it never runs the code.', one: 'Link copied. It holds this code and the {n} option you changed. Opening it never runs the code.', other: 'Link copied. It holds this code and the {n} options you changed. Opening it never runs the code.' },
      linkField: 'Copy this link:',
      linkFieldName: 'Link to this code',
      tooLong: 'This code is too long to share as a link. Its link would be {length} characters, and links stop at {limit}.',
      brokenLink: "The shared code couldn't be read. The link may have been cut off or changed, so the Playground opened with the starting example. Nothing ran.",
      unknownOptions: { one: "The link set {n} option this version doesn't know, {names}, so it was left out.", other: "The link set {n} options this version doesn't know, {names}, so they were left out." },
      unknownKeptOptions: { one: "Your kept code set {n} option this version doesn't know, {names}, so it was left out.", other: "Your kept code set {n} options this version doesn't know, {names}, so they were left out." },
      sharedOpened: "This code came from a shared link and hasn't run. Press Run to run it.",
      sharedReplaced: "This code came from a shared link and hasn't run. Press Run to run it. It replaced the code you had here.",
      exampleReplaced: 'The example {title} replaced your code.',
      resetDone: 'The Playground was reset to the starting example and the default options.',
      cantKeepCode: "This browser can't keep your code, so it stays only while this page is open.",
      cantKeepTypeScript: "This browser can't keep TypeScript for offline use, so the Playground downloads it again on each visit.",
      actions: { undo: 'Undo', run: 'Run', 'share-with': 'Share with…', 'copy-code': 'Copy the code', retry: 'Retry' },
      codeCopied: 'Code copied.',
      dismiss: 'Dismiss',
    },
    popups: {
      stuck: {
        heading: 'This code may be stuck in a loop',
        text: 'It has run for {seconds} seconds without a pause. Stop it, or keep waiting and the Playground asks again in {seconds} seconds.',
        stop: 'Stop',
        keepWaiting: 'Keep waiting',
      },
      reset: {
        heading: 'Reset the Playground?',
        text: 'The starting example and the default options come back, and your code is no longer kept in this browser. Until you edit again, Undo brings your code back.',
        confirm: 'Reset',
        cancel: 'Cancel',
      },
      keys: {
        heading: 'Keys',
        lede: { mac: 'The editor uses VS Code\'s keys, for a Mac. The menu bar, the dock and the other windows keep their own shortcuts, Option+Shift with a letter, even from inside the editor.', other: "The editor uses VS Code's keys, for Windows and Linux. The menu bar, the dock and the other windows keep their own shortcuts, Alt+Shift with a letter, even from inside the editor." },
        help: { mac: 'To leave the editor, press {tab} and then Tab. To move to the next error, press F8; to hear the type of a name, press {hover}.', other: 'To leave the editor, press {tab} and then Tab. To move to the next error, press F8; to hear the type of a name, press {hover}.' },
        command: 'Command',
        key: 'Key',
        footer: 'Every command is in the command palette, F1, with its key.',
        close: 'Close',
        differs: {
          shell: 'Not VS Code\'s key: the shell keeps its own shortcuts.',
          browser: 'Not VS Code\'s key: a browser keeps {key} for itself.',
          'screen-reader': 'Not VS Code\'s key: screen readers keep {key} for themselves.',
          'not-vs-code': 'Not a VS Code command: the official Playground\'s key.',
        },
      },
    },
    options: {
      heading: 'Compiler options',
      defaults: 'Reset to defaults',
      close: 'Close compiler options',
      groups: { language: 'Language', strict: 'Strict checks', checks: 'Other checks', output: 'Output' },
      changedNone: 'Every option is at its default.',
      changed: { one: 'Changed from the defaults: {names}. Shared links carry it.', other: 'Changed from the defaults: {names}. Shared links carry them.' },
      descriptions: {
        target: 'The JavaScript version the code compiles to.',
        strict: 'Turns on every strict check below.',
        noImplicitAny: "A value whose type can't be worked out is an error.",
        strictNullChecks: 'null and undefined are their own types.',
        strictFunctionTypes: 'Function parameters are checked exactly.',
        strictBindCallApply: 'bind, call and apply are checked against the function.',
        strictPropertyInitialization: 'Class properties must be set in the constructor.',
        strictBuiltinIteratorReturn: 'Built-in iterators return undefined, not any.',
        noImplicitThis: 'this with no type is an error.',
        useUnknownInCatchVariables: 'A caught error is unknown, not any.',
        noUncheckedIndexedAccess: 'Reading by index may give undefined.',
        exactOptionalPropertyTypes: "An optional property can't be set to undefined.",
        noImplicitReturns: 'Every path through a function must return.',
        noFallthroughCasesInSwitch: "A case can't fall through to the next.",
        noImplicitOverride: 'A method that overrides one must say override.',
        noPropertyAccessFromIndexSignature: 'Index-signature fields are read with brackets.',
        noUnusedLocals: 'A name declared and never read is an error.',
        noUnusedParameters: 'A parameter never read is an error.',
        declaration: 'Produce type declarations for the Declarations pane.',
        removeComments: 'Leave comments out of the JavaScript.',
        noEmitOnError: 'Produce no JavaScript while there are errors.',
        useDefineForClassFields: 'Class fields are set as JavaScript sets them.',
        experimentalDecorators: 'Use the older, experimental decorators.',
        preserveConstEnums: 'Keep const enum declarations in the JavaScript.',
      },
    },
    examples: {
      heading: 'Examples',
      close: 'Close examples',
      groups: { start: 'Start', types: 'Types', running: 'Running', cv: 'The CV as data' },
      note: 'An example replaces your code. Undo brings it back.',
    },
    status: {
      label: 'Editor status',
      position: 'Ln {line}, Col {column}',
      spaces: 'Spaces: {n}',
      noErrors: 'No errors',
      errors: { one: '{n} error', other: '{n} errors' },
      checking: 'Checking…',
      tabMovesFocus: 'Tab moves focus',
      version: 'TypeScript {version}',
    },
    editor: {
      name: 'Code editor',
      description: { mac: 'TypeScript code. Press F1 for commands, Option+F1 for accessibility help, and Ctrl+Shift+M to make Tab move focus.', other: 'TypeScript code. Press F1 for commands, Alt+F1 for accessibility help, and Ctrl+M to make Tab move focus.' },
      packages: "Packages can't be imported here. The Playground runs one file of code, with no packages.",
      runCommand: 'Run the code',
      keysCommand: 'Keys and accessibility help',
    },
    mobile: {
      app: { heading: 'The Playground is best on a desktop', text: "It's a TypeScript editor that checks and runs code in your browser. Writing code needs a keyboard and room for its panes, so it opens on a desktop.", note: 'The link opens the Playground on a desktop.' },
      link: { heading: 'This link holds TypeScript code', text: 'Someone shared code from the Playground, a TypeScript editor that runs in the browser. Open the link on a desktop to read, check and run it. Nothing runs here.', note: 'Sharing passes on the same link, with its code.' },
      shareLink: 'Share link',
      copyLink: 'Copy link',
      copied: 'Link copied.',
      tooLongCopied: 'This code is too long to share as a link, so the code itself was copied.',
      tooLongRefused: "This code is too long to share as a link, and it couldn't be copied.",
    },
    // The commands in the list of keys, by the editor's command id (FR-085).
    keyLabels: {
      'playground.run': 'Run the code',
      'editor.action.quickCommand': 'Command palette',
      'editor.action.triggerSuggest': 'Suggestions',
      'editor.action.triggerParameterHints': 'Parameter hints',
      'editor.action.showHover': 'Show the type',
      'editor.action.revealDefinition': 'Go to definition',
      'editor.action.peekDefinition': 'Peek definition',
      'editor.action.goToReferences': 'Every use',
      'editor.action.rename': 'Rename',
      'editor.action.quickFix': 'Quick fixes',
      'editor.action.marker.next': 'Next error',
      'editor.action.marker.prev': 'Previous error',
      'editor.action.formatDocument': 'Format document',
      'editor.action.formatSelection': 'Format selection',
      'editor.action.commentLine': 'Comment out lines',
      'actions.find': 'Find',
      'editor.action.startFindReplaceAction': 'Replace',
      'editor.action.gotoLine': 'Go to line',
      'editor.action.quickOutline': 'Go to symbol',
      'editor.action.addSelectionToNextFindMatch': 'Add the next match',
      'editor.action.moveLinesUpAction': 'Move line up',
      'editor.action.moveLinesDownAction': 'Move line down',
      'editor.action.copyLinesDownAction': 'Copy line down',
      'editor.action.deleteLines': 'Delete line',
      'editor.action.smartSelect.expand': 'Expand selection',
      'editor.fold': 'Fold',
      'editor.unfold': 'Unfold',
      'editor.action.toggleTabFocusMode': 'Tab moves focus',
      'playground.keys': 'Accessibility help and keys',
    },
    // The window's menu items (FR-003, FR-085).
    menu: {
      run: 'Run',
      stop: 'Stop',
      examples: 'Examples…',
      options: 'Compiler options…',
      share: 'Share…',
      palette: 'Command palette',
      keys: 'Keys…',
      reset: 'Reset…',
    },
    announce: {
      downloadStarted: 'Downloading TypeScript.',
      downloadStep: 'TypeScript download {percent}% done.',
      downloadDone: 'TypeScript downloaded.',
      downloadFailed: 'The TypeScript download stopped.',
      errors: { none: 'No errors', one: '{n} error', other: '{n} errors' },
      newLogs: { one: '{n} new log entry', other: '{n} new log entries' },
      runStarted: 'The code is running.',
      runningAgain: 'The code is running again.',
      timers: { none: 'No timers left.', one: '{n} timer left.', other: '{n} timers left.' },
    },
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
