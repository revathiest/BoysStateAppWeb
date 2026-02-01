// public/js/apply-address.js

// US States list
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
];

function initAddressHelpers(form) {
  // Find all state dropdowns in address fields and populate them
  Array.from(form.querySelectorAll("select[name$='_state']")).forEach(stateSelect => {
    stateSelect.innerHTML = '<option value="">State</option>' +
      US_STATES.map(s => `<option value="${s}">${s}</option>`).join('');
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initAddressHelpers, US_STATES };
}
