/**
 * Every wait in the suite is a state wait, so these values only bound how long a
 * genuinely stuck state is tolerated before the test reports it.
 */
export const TIMEOUTS = {
  /**
   * Comfortably above the sum of the sub-budgets below, so that a slow-but-healthy run fails on
   * the step that is actually stuck rather than on the test as a whole.
   */
  test: 180_000,

  expect: 20_000,
  navigation: 45_000,

  /**
   * The payment provider's cross-origin form loads noticeably later than the host modal
   * around it, so its fields get their own, longer budget.
   */
  paymentFrame: 75_000,

  /**
   * How long a single tap is given to produce a navigation before it is repeated. Short on
   * purpose: it bounds one attempt, not the step, which has its own budget.
   */
  hydrationRetry: 4_000,
} as const;
