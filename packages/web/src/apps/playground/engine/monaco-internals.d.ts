// Types for the Monaco modules the engine imports that ship none (research
// R6): its worker bootstrap and its TypeScript worker class.
declare module 'monaco-editor/internal/common/initialize' {
  export function initialize(callback: (ctx: unknown, createData: unknown) => unknown): void;
}

declare module 'monaco-editor/languages/features/typescript/tsWorker' {
  export class TypeScriptWorker {
    constructor(ctx: unknown, createData: unknown);
    // TypeScript's language service, of the bundled TypeScript 5, whose types
    // the repository doesn't have (its own TypeScript is 7).
    getLanguageService(): any;
    getCompilationSettings(): any;
    getCodeFixesAtPosition(fileName: string, start: number, end: number, errorCodes: number[], formatOptions: unknown): Promise<readonly any[]>;
    _getModel(fileName: string): { version: number; uri: unknown } | null;
  }
}

// The TypeScript Monaco bundles (5.9). The repository's own TypeScript is 7,
// which has no JavaScript API and so no types for this one.
declare module 'monaco-editor/languages/features/typescript/lib/typescriptServices' {
  export const typescript: any;
}

declare module 'monaco-editor/languages/features/typescript/lib/typescriptServicesMetadata' {
  export const typescriptVersion: string;
}

declare module 'monaco-editor/languages/definitions/typescript/typescript' {
  export const conf: unknown;
  export const language: unknown;
}

declare module '*?worker' {
  const WorkerConstructor: new (options?: { name?: string }) => Worker;
  export default WorkerConstructor;
}
