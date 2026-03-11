export function toDateOnly(input: Date | string) {
  const date = typeof input === 'string' ? new Date(input) : input;
  return date.toISOString().slice(0, 10);
}

export function formatDate(input: string | null | undefined) {
  if (!input) return 'n/a';
  return input.slice(0, 10);
}
