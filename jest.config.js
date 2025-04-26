export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/tests'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            useESM: true
        }]
    },
    extensionsToTreatAsEsm: ['.ts'],
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFilesAfterEnv: ['<rootDir>/tests/mocks/jest.setup.ts'],
    moduleNameMapper: {
        '^obsidian$': '<rootDir>/tests/mocks/obsidian-mock.ts'
    },
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    verbose: true
}; 