/**
 * Accept Moroccan fixed/mobile numbers entered locally or with the +212 prefix.
 * Return a consistent national format for confirmation calls and deliveries.
 */
export function normalizeMoroccanPhone(value: string): string | null {
  if (typeof value !== 'string') return null;

  const ascii = value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
  const compact = ascii.replace(/[\s().-]/g, '');

  let local = compact;
  if (local.startsWith('+212')) {
    local = '0' + local.slice(4);
  } else if (local.startsWith('00212')) {
    local = '0' + local.slice(5);
  } else if (local.startsWith('212')) {
    local = '0' + local.slice(3);
  }

  return /^0[567]\d{8}$/.test(local) ? local : null;
}
