import { INTENT_LANDINGS, type IntentLanding } from './intentLandings';
import { MODEL_LANDINGS } from './modelLandings';

// Single source for everything served at /lease/:slug: the intent landings (budget, $0 down,
// EV, best-scored) plus the per-model Hyundai landings. Kept in one place so IntentLandingPage
// and the related-search cross-links resolve against the full set.
export const ALL_LANDINGS: IntentLanding[] = [...INTENT_LANDINGS, ...MODEL_LANDINGS];

export const getLanding = (slug: string | undefined): IntentLanding | undefined =>
  ALL_LANDINGS.find((l) => l.slug === slug);
