# Project Structure

## Folder Organization
```
rename-wizard/
├── src/
│   ├── components/           # UI Components
│   │   ├── modal/           # Rename modal related components
│   │   │   ├── RenameModal.ts
│   │   │   ├── SuggestionList.ts
│   │   │   └── SearchField.ts
│   │   └── settings/        # Settings tab components
│   │       ├── SettingsTab.ts
│   │       └── sections/    # Settings section components
│   ├── services/            # Core business logic
│   │   ├── suggestion/      # Suggestion system
│   │   │   ├── SuggestionService.ts
│   │   │   ├── RankingService.ts
│   │   │   └── FuzzySearch.ts
│   │   ├── rename/         # Rename operations
│   │   │   ├── RenameService.ts
│   │   │   └── BatchRenameService.ts
│   │   └── metrics/        # Performance tracking
│   │       ├── MetricsService.ts
│   │       └── PerformanceMonitor.ts
│   ├── models/             # Type definitions and interfaces
│   │   ├── settings.ts
│   │   ├── suggestion.ts
│   │   └── metrics.ts
│   ├── utils/              # Utility functions
│   │   ├── validation.ts
│   │   ├── fileSystem.ts
│   │   └── i18n.ts
│   └── main.ts            # Plugin entry point
├── tests/                 # Test files matching src structure
│   ├── components/
│   ├── services/
│   └── utils/
├── styles/               # CSS styles
│   ├── components/
│   └── main.css
└── i18n/                # Internationalization files
    ├── en.json
    └── fr.json
```

## Key Components and Responsibilities

### 1. Core Services
- **SuggestionService**: Manages suggestion generation and filtering
  - Handles real-time updates
  - Implements fuzzy search
  - Manages suggestion cache
  
- **RenameService**: Handles file renaming operations
  - Single file rename operations
  - File system interactions
  - Error handling and validation
  
- **BatchRenameService**: Manages batch operations
  - Batch operation coordination
  - Safety mechanisms
  - Progress tracking
  
- **MetricsService**: Handles performance monitoring
  - Operation timing
  - Statistics collection
  - Performance reporting

### 2. UI Components
- **RenameModal**: Main rename interface
  - Input handling
  - Suggestion display
  - Error presentation
  
- **SettingsTab**: Plugin configuration interface
  - Settings management
  - Tab organization
  - Configuration persistence

### 3. Utilities
- **validation.ts**: Input validation functions
- **fileSystem.ts**: File system operations
- **i18n.ts**: Internationalization utilities

## Data Flow

1. **Rename Operation Flow**:
```
User Input → RenameModal
    → SuggestionService (generates suggestions)
    → RankingService (ranks suggestions)
    → UI Update
    → RenameService (performs rename)
    → MetricsService (records performance)
```

2. **Batch Operation Flow**:
```
BatchRenameService
    → RenameService (for each file)
    → Error Collection
    → Progress Updates
    → MetricsService
```

3. **Settings Flow**:
```
SettingsTab → Settings Storage
    → Service Configuration
    → Component Updates
```

## File Naming Conventions

1. **Component Files**:
   - PascalCase for component names
   - Suffix with component type (e.g., `RenameModal.ts`)
   - Test files: `ComponentName.test.ts`

2. **Service Files**:
   - PascalCase for service names
   - Suffix with 'Service' (e.g., `RenameService.ts`)
   - Test files: `ServiceName.test.ts`

3. **Utility Files**:
   - camelCase for utility files
   - Descriptive names (e.g., `fileSystem.ts`)
   - Test files: `utilityName.test.ts`

## Testing Structure

1. **Unit Tests**:
   - Service logic
   - Utility functions
   - Component logic

2. **Integration Tests**:
   - Service interactions
   - File system operations
   - Settings persistence

3. **Performance Tests**:
   - Large vault operations
   - Batch processing
   - Suggestion generation

4. **Test Organization**:
```
tests/
├── unit/
│   ├── services/
│   ├── utils/
│   └── components/
├── integration/
│   ├── rename/
│   └── batch/
└── performance/
    ├── large-vault/
    └── batch-operations/
```

## Development Guidelines

1. **Code Organization**:
   - One class/component per file
   - Clear separation of concerns
   - Dependency injection for services

2. **Error Handling**:
   - Centralized error handling
   - Clear error messages
   - Proper error propagation

3. **Performance Considerations**:
   - Lazy loading where appropriate
   - Efficient caching strategies
   - Debounced operations

4. **Documentation**:
   - JSDoc comments for public APIs
   - Inline comments for complex logic
   - README updates for new features 