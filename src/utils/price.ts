/**
 * Parses a rendered price string into a currency token and a numeric amount.
 *
 * The same amount renders differently in the two places the suite compares it - the paywall
 * shows `ГРН 99`, checkout shows `ГРН 99.00` - so a raw string comparison fails. The currency
 * is a localised token placed *before* the amount and is never assumed to be Ukrainian hryvnia
 * or any particular symbol position, because a CI runner in another country sees a different
 * token and a different amount (see docs/exploration-notes.md, section 1).
 *
 * Expects a node whose text is just a price: the currency token is whatever remains once the
 * numeric run, the sign and the whitespace are removed, so trailing prose would end up inside it.
 *
 * A leading minus is discarded rather than returned - `-ГРН 200.00` parses as 200. Only the
 * paywall price and the checkout total are parsed here and both are positive, but a future caller
 * parsing the discount row would get a positive number, so give it a signed variant instead.
 *
 * Grouping-versus-decimal heuristic (a judgement call, not a certainty):
 * - Both `.` and `,` present: the LAST one is the decimal separator, the other is grouping.
 * - Only one separator kind present: it is treated as a grouping separator when every digit
 *   run after it is exactly three digits long (so `1,299` is 1299 and `1,234,567` is 1234567),
 *   otherwise it is treated as a decimal separator (so `9,99` is 9.99 and `99.00` is 99).
 *
 * That rule is wrong for the five three-decimal currencies - KWD, BHD, OMR, TND, JOD - where
 * `KWD 9.990` parses as 9990 rather than 9.99. It is left as is because the alternative is
 * hard-coding a currency table, and because both values the suite compares come from the same
 * locale on the same page load: a consistent misparse on both sides still compares equal. A run
 * priced in one of those currencies would need this revisited, and NOTES.md records that.
 */

export interface Price {
  currency: string;
  amount: number;
}

/** Regular space, non-breaking space (U+00A0) and narrow non-breaking space (U+202F). */
const WHITESPACE_PATTERN = /[ \u00A0\u202F]/g;

/** The numeric portion of a price: digits and separators, always starting/ending with a digit. */
const NUMERIC_PATTERN = /\d[\d.,]*\d|\d/;

export function parsePrice(raw: string): Price {
  const cleaned = raw.replace(WHITESPACE_PATTERN, '');
  const match = NUMERIC_PATTERN.exec(cleaned);

  if (match === null) {
    throw new Error(`parsePrice: no digits found in price "${raw}"`);
  }

  const numericPortion = match[0];
  const amount = parseAmount(numericPortion);
  const currency = (cleaned.slice(0, match.index) + cleaned.slice(match.index + numericPortion.length)).replace(
    /-/g,
    '',
  );

  return { currency, amount };
}

function parseAmount(numericPortion: string): number {
  const hasDot = numericPortion.includes('.');
  const hasComma = numericPortion.includes(',');

  if (hasDot && hasComma) {
    return parseWithMixedSeparators(numericPortion);
  }

  if (hasDot || hasComma) {
    return parseWithSingleSeparatorKind(numericPortion, hasDot ? '.' : ',');
  }

  return Number(numericPortion);
}

/** Both separator kinds are present: the last one wins as the decimal separator. */
function parseWithMixedSeparators(numericPortion: string): number {
  const lastDotIndex = numericPortion.lastIndexOf('.');
  const lastCommaIndex = numericPortion.lastIndexOf(',');
  const decimalIndex = Math.max(lastDotIndex, lastCommaIndex);
  const groupingChar = decimalIndex === lastDotIndex ? ',' : '.';

  const integerPart = numericPortion.slice(0, decimalIndex).split(groupingChar).join('');
  const fractionPart = numericPortion.slice(decimalIndex + 1);

  return Number(`${integerPart}.${fractionPart}`);
}

/** Only one separator kind is present: distinguish grouping from decimal by trailing group width. */
function parseWithSingleSeparatorKind(numericPortion: string, separator: '.' | ','): number {
  const parts = numericPortion.split(separator);
  const trailingGroups = parts.slice(1);
  const isGrouping = trailingGroups.length > 0 && trailingGroups.every((part) => part.length === 3);

  if (isGrouping) {
    return Number(parts.join(''));
  }

  const fractionPart = parts[parts.length - 1] ?? '';
  const integerPart = parts.slice(0, -1).join('');

  return Number(`${integerPart}.${fractionPart}`);
}
