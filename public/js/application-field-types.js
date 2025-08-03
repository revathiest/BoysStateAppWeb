// application-field-types.js

// Supported field types with labels and config
const FIELD_TYPES = [
  { value: "short_answer", label: "Short Answer" },
  { value: "paragraph", label: "Paragraph" },
  { value: "dropdown", label: "Dropdown (Select)" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "date", label: "Date Picker" },
  { value: "date_range", label: "Date Range" },
  { value: "phone", label: "Phone Number" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "file", label: "Document Upload" },
  { value: "section", label: "Section/Header" },
  { value: "static_text", label: "Static Text / Instructions" },
  { value: "boolean", label: "Yes/No (Boolean)" },
  { value: "address", label: "Address" }
];

function renderFieldTypeOptions(selected) {
  return FIELD_TYPES.map(
    t => `<option value="${t.value}"${selected === t.value ? " selected" : ""}>${t.label}</option>`
  ).join("");
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIELD_TYPES, renderFieldTypeOptions };
} else {
  window.FIELD_TYPES = FIELD_TYPES;
  window.renderFieldTypeOptions = renderFieldTypeOptions;
}
