export function installDebugGlobals() {
  (globalThis as any).toDebugText = (items: string[]) => items.join('\n');
}
