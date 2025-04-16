import { RenameWizardSettings } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/utils/constants';

describe('RenameWizardSettings', () => {
    let settings: RenameWizardSettings;

    beforeEach(() => {
        settings = { ...DEFAULT_SETTINGS };
    });

    test('should have default settings', () => {
        expect(settings).toBeDefined();
        expect(settings.mergeTemplate).toBeDefined();
        expect(typeof settings.mergeTemplate).toBe('string');
    });

    test('should be able to update merge template', () => {
        const newTemplate = '{{title}} - {{date}}';
        settings.mergeTemplate = newTemplate;
        expect(settings.mergeTemplate).toBe(newTemplate);
    });
}); 