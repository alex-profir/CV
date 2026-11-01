// The rest of the site's words (006 data-model.md Site text): those only the
// shell's worker prints, in a module of their own so the os script doesn't carry
// them (SC-013). Changing a word is one edit here, as in `site-text.ts`.
import { deepFreeze } from './freeze.ts';
import { siteText } from './site-text.ts';

const shellText = deepFreeze({
  replies: {
    ...siteText.terminal.replies,
    helpUnknown: 'help: no command is named {name}. Run {help} to see them all.',
    usage: '{command} takes {what}. Usage: {usage}',
    open: 'open takes {cv}, {playground} or {about}.',
    emptySection: 'The CV lists no {section}.',
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
    cv: { args: '', description: "The CV's JSON in vim: cat cv.json | jq | vim -", help: 'Opens the whole CV as JSON in a vim view, by running cat cv.json | jq | vim -. Type :q to come back.' },
    site: { args: '', description: 'What this site is and how it was built', help: 'Says what this site is and how it was built, with a link to its source code.' },
    specs: { args: '', description: "The site's feature specs", help: 'Lists every feature spec the site was built from, with its status and its number of requirements.' },
    ls: { args: '[path]', description: 'List a folder', help: 'Lists the folder you are in, or the folder or file a path names. Click a name to open it.' },
    cd: { args: '[path]', description: 'Change folder. cd alone goes home', help: 'Changes the folder you are in. cd .. goes up, and cd alone goes back to the home folder, ~.' },
    cat: { args: '<path>', description: 'Show a file', help: 'Shows a file. cat cv.json shows the whole CV as JSON.' },
    jq: { args: '[path]', description: 'Pretty-print JSON', help: 'Pretty-prints JSON, from a path or from what is piped in, such as cat cv.json | jq.' },
    vim: { args: '[path | -]', description: 'Edit a file in vim. - reads what is piped in', help: 'Opens a file in a vim view to read or edit. vim - reads what is piped in. Type :help there for its keys, and :q to leave.' },
    pwd: { args: '', description: 'Show the current folder', help: 'Shows the path of the folder you are in.' },
    open: { args: '<name>', description: 'Open cv, playground or about in the shell', help: 'Opens the CV app with open cv, the Playground with open playground, or About this site with open about.' },
    history: { args: '', description: 'Commands run so far', help: 'Lists the commands run since the Terminal opened, oldest first. The Up and Down arrows step through them.' },
    clear: { args: '', description: 'Clear the screen', help: 'Clears the output. The commands stay in the history.' },
    exit: { args: '', description: 'Close the Terminal', help: 'Closes the Terminal on a computer, or goes back to the home screen on a phone.' },
  },
  // `help`'s lead, before the table.
  helpLead: { desktop: 'Click a command to run it, or type it and press Enter.', phone: 'Tap a command to run it.' },
  helpTab: { desktop: 'Tab completes a command or path; Escape then Tab leaves the command line.', phone: 'Tab completes a command or path.' },
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
  // `help`'s group of the shell's own commands (FR-008, FR-068).
  standard: { heading: 'Standard commands', note: 'as in bash. help <command> shows its options.' },
  // Who `ls -l` says owns an entry (FR-049).
  owners: { protected: 'root', visitor: 'guest' },
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
});

export const fullText = deepFreeze({ ...siteText, terminal: { ...siteText.terminal, ...shellText } });

export type FullText = typeof fullText;
