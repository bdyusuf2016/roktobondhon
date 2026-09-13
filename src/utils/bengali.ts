/**
 * Bengali Number and text utilities
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Converts English digits (0-9) to Bengali numerals (০-৯)
 * Example: 8 -> '৮', 25 -> '২৫', '8' -> '৮'
 */
export function toBengaliNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return '';
  return String(val).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/**
 * Converts Bengali digits (০-৯) to English numerals (0-9)
 */
export function toEnglishNumber(val: string | undefined | null): string {
  if (!val) return '';
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return String(val).replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);
}
