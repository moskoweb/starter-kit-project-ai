export function pendingScopeProtections(dbDirectory: string): Promise<{
  manifest: Record<string, string>;
  pending: { name: string; sql: string; hash: string }[];
}>;
