// The declarations the code sees beside a worker's globals (research R14):
// the three dialogs as the runtime gives them. The engine adds them as
// `file:///playground-globals.d.ts`.
export const GLOBALS_TYPES = `/** Logs an alert entry; the code goes on. */
declare function alert(message?: unknown): void;
/** Not available in the Playground: logs a note and returns null. */
declare function prompt(message?: string, _default?: string): string | null;
/** Not available in the Playground: logs a note and returns false. */
declare function confirm(message?: string): boolean;
`;
