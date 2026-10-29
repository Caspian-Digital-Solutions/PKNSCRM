export const FORM_TEMPLATES = [
  {
    id: 'tpl-family',
    name: 'Activation registration (family)',
    purpose: 'Activation registration',
    description: 'Family registration with household and interests.',
    fields: ['fullName', 'mobile', 'email', 'postcode', 'ageBand', 'householdSize', 'childrenAgeBands', 'interests', 'heard'],
  },
  {
    id: 'tpl-feedback',
    name: 'Event feedback survey',
    purpose: 'Event feedback survey',
    description: 'Short survey after an activation.',
    fields: ['rating', 'interests', 'comments'],
  },
  {
    id: 'tpl-draw',
    name: 'Lucky draw entry',
    purpose: 'Lucky draw entry',
    description: 'Name, mobile, and receipt for a draw.',
    fields: ['fullName', 'mobile', 'comments'],
  },
  {
    id: 'tpl-tenant',
    name: 'Tenant enquiry',
    purpose: 'Tenant enquiry',
    description: 'Always-on enquiry for a PKNS space.',
    mode: 'Always-on',
    fields: ['fullName', 'mobile', 'email', 'interestedRent'],
  },
  {
    id: 'tpl-news',
    name: 'Newsletter sign-up',
    purpose: 'Newsletter sign-up',
    description: 'Name, contact, and interests.',
    mode: 'Always-on',
    fields: ['fullName', 'email', 'mobile', 'interests'],
  },
  {
    id: 'tpl-vendor',
    name: 'Volunteer / vendor sign-up',
    purpose: 'Volunteer / vendor sign-up',
    description: 'Organisation and contact for a stall or volunteer shift.',
    fields: ['fullName', 'mobile', 'email', 'comments'],
  },
  {
    id: 'tpl-walkin',
    name: 'Walk-in quick capture',
    purpose: 'Activation registration',
    description: 'Mobile, postcode, and group size for a kiosk.',
    fields: ['mobile', 'postcode', 'householdSize', 'childrenCount'],
  },
];

export const PURPOSES = [
  'Activation registration',
  'Event feedback survey',
  'Lucky draw entry',
  'Tenant enquiry',
  'Newsletter sign-up',
  'Volunteer / vendor sign-up',
  'General enquiry',
  'Custom',
];

export const TOUCHPOINTS = ['Entrance banner', 'Booth A', 'Booth B', 'Flyer', 'Standee', 'Social post'];
