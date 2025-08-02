const { renderApplicationForm } = require('../public/js/apply-form.js');

describe('renderApplicationForm', () => {
  beforeEach(() => {
    const elements = {
      programTitle: { textContent: '' },
      programBranding: { innerHTML: '' },
      applicationForm: { innerHTML: '' }
    };
    global.document = {
      getElementById: id => elements[id]
    };
    global.elements = elements;
  });

  test('renders form fields', () => {
    const config = {
      title: 'Test App',
      description: 'Desc',
      questions: [
        { id: 1, order: 1, type: 'short_answer', text: 'Name', required: true },
        { id: 2, order: 2, type: 'section', text: 'Section' },
        { id: 3, order: 3, type: 'static_text', text: 'Info' }
      ]
    };
    renderApplicationForm(config);
    expect(global.elements.programTitle.textContent).toBe('Test App');
    expect(global.elements.applicationForm.innerHTML).toContain('Name');
    expect(global.elements.applicationForm.innerHTML).toContain('Section');
    expect(global.elements.applicationForm.innerHTML).toContain('Info');
  });
});

