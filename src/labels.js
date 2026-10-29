export const FIELD_LABELS = {
  ageBand: 'Age band',
  gender: 'Gender',
  area: 'Area',
  postcode: 'Postcode',
  childrenAgeBand: "Children's age band",
  hasChildren: 'Has children',
  interest: 'Interest',
  leadType: 'Lead type',
  source: 'Source channel',
  legacy: 'Legacy import',
  interestedRent: 'Interested in renting',
  interestedBuy: 'Interested in buying',
  asset: 'Asset',
  activationType: 'Activation type',
  festiveAssets: 'Festive assets attended',
  activationsAttended: 'Activations attended',
  firstSeen: 'First seen',
  fullName: 'Full name',
  mobile: 'Mobile number',
  email: 'Email',
  householdSize: 'Household size',
  childrenCount: 'Number of children',
  childrenAgeBands: "Children's age bands",
  interests: 'Interests',
  heard: 'How did you hear about us',
  party: 'Who are you here with',
  rating: 'Rating',
  comments: 'Comments',
};

export const OP_LABELS = {
  eq: 'is',
  includes: 'includes',
  gte: 'is at least',
  lte: 'is at most',
  before: 'is before',
  after: 'is after',
  any: 'is any of',
};

export function fieldLabel(id) {
  return FIELD_LABELS[id] || String(id || '').replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

export function opLabel(op) {
  return OP_LABELS[op] || op;
}
