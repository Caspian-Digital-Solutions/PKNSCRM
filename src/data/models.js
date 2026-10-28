/**
 * JS data shapes for the AMP Hub. This stack is JavaScript, so the models
 * are documented here and produced by generate.js rather than TypeScript.
 *
 * @typedef {'Mall'|'Office'|'Mixed-use'|'Open space'|'Township site'} AssetType
 * @typedef {'Active'|'Under redevelopment'|'Planned'} AssetStatus
 * @typedef {'PKNS AMP'|'Operator'} RunBy
 * @typedef {'Planned'|'Approved'|'Live'|'Completed'|'Reported'} ActivationStatus
 * @typedef {'Visitor'|'Programme participant'|'Prospective tenant'|'Prospective buyer'|'Business / vendor'} LeadType
 */

export const MODELS = [
  'Asset', 'Operator', 'Activation', 'SpendLine', 'Form', 'FormField', 'ConsentBlock',
  'Profile', 'Segment', 'DigitalMetric', 'SocialPost', 'Budget', 'ImportJob', 'AuditLogEntry',
];
