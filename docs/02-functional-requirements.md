# Functional Requirements

## Core Features

### Suggestion System
- Real-time updates during typing
- No minimum character requirement
- Fuzzy matching enabled
- Recent renames shown as default suggestions
- Last search pattern preservation until cleared

### File Sources for Suggestions
1. Existing files
2. Dead links (referenced but non-existing files)
3. Recently renamed files

### Ranking Factors
1. File proximity (text similarity)
2. Reference frequency (connection count)

## User Interface Components

### Rename Modal
- Main rename input field
- Separate search field for advanced features
- Dropdown interface for suggestions
- Character count display
- Visual indicators for warnings

### Settings Interface
- Tabbed organization by categories
- Configuration sections:
  - Suggestion preferences
  - Safety mechanisms
  - Performance monitoring
  - History view
  - Batch operation settings

### Keyboard Integration
- Shortcut for modal activation
- Optional right-click rename integration

## Batch Operations
- Toggle button in rename interface
- String replacement across multiple files
- Configurable safety mechanisms
- Progress tracking and error reporting 