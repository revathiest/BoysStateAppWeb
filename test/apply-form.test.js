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

  test('handles various field types', () => {
    const config = {
      title: '',
      description: '',
      questions: [
        { id: 1, order: 1, type: 'dropdown', text: 'D', options: ['a','b'] },
        { id: 2, order: 2, type: 'radio', text: 'R', options: ['x','y'] },
        { id: 3, order: 3, type: 'checkbox', text: 'C', options: ['m','n'] },
        { id: 4, order: 4, type: 'file', text: 'F', accept: '.pdf', maxFiles: 1 },
        { id: 5, order: 5, type: 'boolean', text: 'B' },
        { id: 6, order: 6, type: 'date_range', text: 'DR' },
        { id: 7, order: 7, type: 'address', text: 'A' },
        { id: 8, order: 8, type: 'email', text: 'E' },
        { id: 9, order: 9, type: 'number', text: 'N' },
        { id:10, order:10, type: 'phone', text: 'P' },
        { id:11, order:11, type: 'paragraph', text: 'Par' },
        { id:12, order:12, type: 'date', text: 'Date' }
      ]
    };
    renderApplicationForm(config);
    expect(global.elements.applicationForm.innerHTML).toContain('select');
    expect(global.elements.applicationForm.innerHTML).toContain('type="file"');
    expect(global.elements.applicationForm.innerHTML).toContain('checkbox');
  });
});

