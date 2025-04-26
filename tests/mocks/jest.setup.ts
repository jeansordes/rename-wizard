// Set up the Jest environment with mocks for external dependencies

import { TextEncoder, TextDecoder } from "util";
import fetchMock from "jest-fetch-mock";

// Declare globals for the test environment
/* global global, jest, window, document */

// Set up global mocks or other Jest configuration here
global.ResizeObserver = jest.fn().mockImplementation(() => ({
	observe: jest.fn(),
	unobserve: jest.fn(),
	disconnect: jest.fn(),
}));

// Mock DOM APIs that might not be available in Jest environment
if (typeof global.TextEncoder === "undefined") {
	global.TextEncoder = TextEncoder as typeof global.TextEncoder;
}

if (typeof global.TextDecoder === "undefined") {
	global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// Jest setup file
fetchMock.enableMocks();

// Set up DOM environment globals
// Provide a minimal MutationObserver polyfill
class MinimalMutationObserver {
	constructor() {
		// Empty constructor, required for the polyfill
	}
	disconnect() {
		// Empty implementation - this is just a mock
	}
	observe() {
		// Empty implementation - this is just a mock
	}
	takeRecords() { return []; }
}
global.MutationObserver = MinimalMutationObserver as unknown as typeof MutationObserver;

// Mock window methods not in jsdom
window.matchMedia =
	window.matchMedia ||
	function () {
		return {
			matches: false,
			addListener: function () {
				// Empty implementation - this is just a mock
			},
			removeListener: function () {
				// Empty implementation - this is just a mock
			},
		};
	};

// Mock Obsidian-specific interfaces
global.createDiv = () => document.createElement("div");
global.createSpan = () => document.createElement("span");

// Create a properly typed mock for moment
type Moment = {
	format: () => string;
	startOf: () => Moment;
	endOf: () => Moment;
	add: () => Moment;
	subtract: () => Moment;
	isSame: () => boolean;
	isBefore: () => boolean;
	isAfter: () => boolean;
	clone: () => Moment;
	toDate: () => Date;
	valueOf: () => number;
	diff: () => number;
	utc: () => Moment;
	local: () => Moment;
	toISOString: () => string;
	toJSON: () => string;
	toString: () => string;
	calendar: () => string;
	isLocal: () => boolean;
	isUTC: () => boolean;
	isUtc: () => boolean;
};

const createMoment = (): Moment => {
	const moment: Moment = {
		format: () => "2023-01-01",
		startOf: () => moment,
		endOf: () => moment,
		add: () => moment,
		subtract: () => moment,
		isSame: () => true,
		isBefore: () => false,
		isAfter: () => false,
		clone: () => moment,
		toDate: () => new Date(),
		valueOf: () => Date.now(),
		diff: () => 0,
		utc: () => moment,
		local: () => moment,
		toISOString: () => new Date().toISOString(),
		toJSON: () => new Date().toJSON(),
		toString: () => "2023-01-01",
		calendar: () => "2023-01-01",
		isLocal: () => true,
		isUTC: () => false,
		isUtc: () => false
	};
	return moment;
};

// Handle the global.moment assignment with better typing
// We're using 'unknown' as an intermediate step, which is safer than 'any'
// because it forces explicit type checks before operations
global.moment = createMoment() as unknown as typeof global.moment;