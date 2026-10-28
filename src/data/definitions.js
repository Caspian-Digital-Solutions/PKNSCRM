import { FORMULAS } from './metrics.js';

const NAMES = {
  ampSpend: 'AMP spend',
  activations: 'Activations completed',
  attendance: 'Total attendance',
  newProfiles: 'New profiles',
  database: 'Database size',
  consented: 'Consented for marketing',
  costAttendee: 'Cost per attendee',
  costProfile: 'Cost per new profile',
  costLead: 'Cost per lead',
  returning: 'Returning rate',
  rating: 'Average rating',
  utilisation: 'Budget utilisation',
  engagement: 'Digital engagement rate',
};

export function definitionById(id) {
  if (!FORMULAS[id]) return null;
  return { name: NAMES[id] || id, formula: FORMULAS[id] };
}
