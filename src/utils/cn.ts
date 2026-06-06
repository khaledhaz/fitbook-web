// Simple class-names merge utility (no clsx/cn dep needed for our use case)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
