/**
 * Pricing calculation logic for Rise GmbH liquidation cases.
 * Shared between the Rechner component and the template engine.
 */

export function calculatePricing(caseData) {
  // Base case fee — 4.500 € if creditors present, otherwise 3.000 €
  const caseFee = caseData.glaeubiger === 'ja' ? 4500 : 3000

  // Altjahre-Cleanup: 800 € per year of backlog
  const rueckstandJahre = Number(caseData.rueckstand_jahre) || 0
  const altjahreCleanup = rueckstandJahre > 0 ? rueckstandJahre * 800 : 0

  // Sperrjahr-Begleitung: 300 € × 12 months = 3.600 €
  // Skipped if company is vermögensfrei (§394 fast-track applies)
  const sperrjahrBegleitung = caseData.vermoegensfrei === 'ja' ? 0 : 3600

  const total = caseFee + altjahreCleanup + sperrjahrBegleitung

  const breakdown = [
    {
      label: caseData.glaeubiger === 'ja'
        ? 'Fallpauschale (mit Gläubigern)'
        : 'Fallpauschale',
      amount: caseFee,
    },
  ]

  if (altjahreCleanup > 0) {
    breakdown.push({
      label: `Altjahre-Cleanup (${rueckstandJahre} Jahr${rueckstandJahre !== 1 ? 'e' : ''} × 800 €)`,
      amount: altjahreCleanup,
    })
  }

  if (sperrjahrBegleitung > 0) {
    breakdown.push({
      label: 'Sperrjahr-Begleitung (12 Monate × 300 €)',
      amount: sperrjahrBegleitung,
    })
  }

  return {
    caseFee,
    altjahreCleanup,
    sperrjahrBegleitung,
    total,
    breakdown,
  }
}

/** Format a number as German currency string, e.g. 3000 → "3.000 €" */
export function formatEUR(amount) {
  return amount.toLocaleString('de-DE') + ' €'
}
