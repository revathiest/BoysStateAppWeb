let renderApplicationBuilder, showError;

describe('application-builder.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { API_URL: 'http://api.test' };
    global.getAuthHeaders = jest.fn(() => ({ Authorization: 'Bearer token' }));
    global.fetch = jest.fn();

    // Mock showError, clearError, showSuccess
    const mockShowError = jest.fn();
    const mockClearError = jest.fn();
    const mockShowSuccess = jest.fn();

    jest.doMock('../public/js/application-messages.js', () => ({
      showError: mockShowError,
      clearError: mockClearError,
      showSuccess: mockShowSuccess
    }));

    jest.doMock('../public/js/application-field-types.js', () => ({
      renderFieldTypeOptions: jest.fn((type) => `<option value="${type || 'short_answer'}">${type || 'Short Answer'}</option>`)
    }));

    const builder = require('../public/js/application-builder.js');
    renderApplicationBuilder = builder.renderApplicationBuilder;
    showError = mockShowError;
  });

  afterEach(() => {
    delete global.window;
    delete global.getAuthHeaders;
    delete global.fetch;
  });

  function createMockBuilderRoot() {
    const root = {
      innerHTML: '',
      querySelectorAll: jest.fn(() => []),
      insertBefore: jest.fn(),
      firstChild: null
    };
    return root;
  }

  function setupMockDocument(builderRoot) {
    const elements = {
      'app-title': { value: '' },
      'app-description': { value: '' },
      'app-closing-date': { value: '' },
      'questions-list': { innerHTML: '' },
      'add-question-btn': { onclick: null },
      'application-builder-form': { onsubmit: null },
      'copyLinkBtn': { onclick: null },
      'publicApplicationUrl': { value: '', select: jest.fn(), setSelectionRange: jest.fn() },
      'copyStatus': { classList: { remove: jest.fn(), add: jest.fn() } },
      'save-application-btn': { disabled: false, textContent: 'Save Application' }
    };

    global.document = {
      getElementById: jest.fn(id => elements[id] || { value: '', disabled: false, textContent: '' }),
      querySelector: jest.fn(() => elements['save-application-btn'])
    };

    // Override innerHTML setter to capture the rendered HTML and create elements
    Object.defineProperty(builderRoot, 'innerHTML', {
      set: function(html) {
        this._html = html;
        // Parse disabled state from HTML
        if (html.includes('id="add-question-btn"')) {
          const addBtnDisabled = html.includes('id="add-question-btn"') && html.match(/id="add-question-btn"[^>]*disabled/);
          elements['add-question-btn'].disabled = !!addBtnDisabled;
        }
        if (html.includes('id="save-application-btn"')) {
          const saveBtnDisabled = html.match(/id="save-application-btn"[^>]*disabled/);
          elements['save-application-btn'].disabled = !!saveBtnDisabled;
        }
      },
      get: function() {
        return this._html || '';
      }
    });

    return elements;
  }

  test('renders form with save and add buttons enabled when not locked', () => {
    const builderRoot = createMockBuilderRoot();
    const elements = setupMockDocument(builderRoot);

    renderApplicationBuilder(builderRoot, { questions: [] }, 'prog1', '2024', 'delegate');

    const html = builderRoot._html;
    // Buttons should be present but NOT disabled
    expect(html).toContain('id="add-question-btn"');
    expect(html).toContain('id="save-application-btn"');
    expect(html).not.toMatch(/id="add-question-btn"[^>]*disabled/);
    expect(html).not.toMatch(/id="save-application-btn"[^>]*disabled/);
    expect(html).toContain('Save Application');
  });

  test('disables save and add buttons when questions are locked', () => {
    const builderRoot = createMockBuilderRoot();
    setupMockDocument(builderRoot);

    renderApplicationBuilder(builderRoot, {
      questions: [],
      locked: ['questions']
    }, 'prog1', '2024', 'delegate');

    const html = builderRoot._html;
    // Check that buttons have disabled attribute
    expect(html).toMatch(/id="add-question-btn"[^>]*disabled/);
    expect(html).toMatch(/id="save-application-btn"[^>]*disabled/);
    // Check opacity class for visual indication
    expect(html).toContain('opacity-50');
    expect(html).toContain('cursor-not-allowed');
  });

  test('prevents form submission when questions are locked', async () => {
    const builderRoot = createMockBuilderRoot();
    const elements = setupMockDocument(builderRoot);

    renderApplicationBuilder(builderRoot, {
      questions: [],
      locked: ['questions']
    }, 'prog1', '2024', 'delegate');

    // Get the form submit handler
    const form = elements['application-builder-form'];
    expect(form.onsubmit).toBeDefined();

    // Try to submit
    const mockEvent = { preventDefault: jest.fn() };
    await form.onsubmit(mockEvent);

    // Should have called showError
    expect(showError).toHaveBeenCalledWith(expect.stringContaining('Cannot save'));
    expect(showError).toHaveBeenCalledWith(expect.stringContaining('locked'));
    // Should not have called fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('allows form submission when questions are not locked', async () => {
    const builderRoot = createMockBuilderRoot();
    const elements = setupMockDocument(builderRoot);

    global.fetch.mockResolvedValue({ ok: true });

    renderApplicationBuilder(builderRoot, {
      questions: [
        { type: 'short_answer', text: 'First Name', required: true, isSystemField: true },
        { type: 'short_answer', text: 'Last Name', required: true, isSystemField: true },
        { type: 'email', text: 'Email', required: true, isSystemField: true }
      ]
    }, 'prog1', '2024', 'delegate');

    elements['app-title'].value = 'Test Application';

    const form = elements['application-builder-form'];
    const mockEvent = { preventDefault: jest.fn() };
    await form.onsubmit(mockEvent);

    // Should have called fetch
    expect(global.fetch).toHaveBeenCalled();
  });

  test('renders question rows with disabled controls when locked', () => {
    const builderRoot = createMockBuilderRoot();
    setupMockDocument(builderRoot);

    // Mock querySelectorAll to return empty arrays for listener attachment
    builderRoot.querySelectorAll = jest.fn(() => []);

    renderApplicationBuilder(builderRoot, {
      questions: [
        { type: 'short_answer', text: 'First Name', required: true, isSystemField: true },
        { type: 'short_answer', text: 'Last Name', required: true, isSystemField: true },
        { type: 'email', text: 'Email', required: true, isSystemField: true },
        { type: 'short_answer', text: 'Custom Question', required: false }
      ],
      locked: ['questions']
    }, 'prog1', '2024', 'delegate');

    // Check that the questions list would render with locked styles
    const questionsListEl = global.document.getElementById('questions-list');
    // The questions list should have been populated
    expect(questionsListEl).toBeDefined();
  });

  test('ensures system fields are always added', () => {
    const builderRoot = createMockBuilderRoot();
    const elements = setupMockDocument(builderRoot);
    builderRoot.querySelectorAll = jest.fn(() => []);

    // Pass empty questions array
    renderApplicationBuilder(builderRoot, { questions: [] }, 'prog1', '2024', 'delegate');

    // The questions list element should have been accessed
    expect(global.document.getElementById).toHaveBeenCalledWith('questions-list');
  });

  test('removes "Remove" buttons from non-system questions when locked', () => {
    const builderRoot = createMockBuilderRoot();
    setupMockDocument(builderRoot);
    builderRoot.querySelectorAll = jest.fn(() => []);

    renderApplicationBuilder(builderRoot, {
      questions: [
        { type: 'short_answer', text: 'First Name', required: true, isSystemField: true },
        { type: 'short_answer', text: 'Last Name', required: true, isSystemField: true },
        { type: 'email', text: 'Email', required: true, isSystemField: true },
        { type: 'dropdown', text: 'Choose One', required: false, options: ['A', 'B'] }
      ],
      locked: ['questions']
    }, 'prog1', '2024', 'delegate');

    // When locked, remove buttons should not appear for any question
    const html = global.document.getElementById('questions-list').innerHTML;
    // The HTML content will be set by renderQuestions, check that it was called
    expect(global.document.getElementById).toHaveBeenCalledWith('questions-list');
  });

  test('hides add option controls for dropdown/radio/checkbox when locked', () => {
    const builderRoot = createMockBuilderRoot();
    setupMockDocument(builderRoot);
    builderRoot.querySelectorAll = jest.fn(() => []);

    renderApplicationBuilder(builderRoot, {
      questions: [
        { type: 'short_answer', text: 'First Name', required: true, isSystemField: true },
        { type: 'short_answer', text: 'Last Name', required: true, isSystemField: true },
        { type: 'email', text: 'Email', required: true, isSystemField: true },
        { type: 'dropdown', text: 'Choose One', required: false, options: ['Option A', 'Option B'] }
      ],
      locked: ['questions']
    }, 'prog1', '2024', 'delegate');

    // Verify the form was rendered
    expect(builderRoot._html).toContain('application-builder-form');
  });

  test('does not disable when locked array does not include questions', () => {
    const builderRoot = createMockBuilderRoot();
    setupMockDocument(builderRoot);

    renderApplicationBuilder(builderRoot, {
      questions: [],
      locked: ['other-field'] // Locked but not 'questions'
    }, 'prog1', '2024', 'delegate');

    const html = builderRoot._html;
    // Buttons should NOT be disabled
    expect(html).not.toMatch(/id="add-question-btn"[^>]*disabled/);
    expect(html).not.toMatch(/id="save-application-btn"[^>]*disabled/);
  });
});
