# Moonstone Importer - Architecture Guide

This document explains the technical architecture of the Moonstone Importer for developers and technical maintainers.

## 🏗️ Architecture Overview

The application follows a modular, service-oriented architecture designed for maintainability and clarity:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Google Sheets │    │   Application   │    │     Notion      │
│                 │───▶│                 │───▶│                 │
│   Form Data     │    │   Processing    │    │   Organized     │
│                 │    │                 │    │   Pages         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Module Structure

### `/src/main.js` - Application Orchestrator

**Purpose**: Main entry point that coordinates the entire import process

**Key Functions**:

- `main()` - Primary application flow
- `validateEnvironment()` - Checks configuration
- `initializeServices()` - Sets up external connections
- `processFormData()` - Handles data processing
- `importToNotion()` - Manages Notion import
- `displayResults()` - Shows completion summary

**Dependencies**: All other modules

### `/src/config/constants.js` - Configuration Hub

**Purpose**: Centralized configuration and constants

**Key Exports**:

- `FORM_QUESTIONS` - Complete question repository
- `VALID_LOCATIONS`, `VALID_VALUATIONS`, etc. - Validation options
- `FORM_TYPE_MAPPINGS` - Maps form intents to types
- `QUESTION_GROUPS` - Organizes questions by section
- `SECTION_TITLES` - Human-readable section names
- `API_CONFIG` - External service configuration

**No Dependencies**: Pure configuration

### `/src/services/` - External Service Adapters

#### `googleSheetsService.js`

**Purpose**: Handles all Google Sheets API interactions

**Key Functions**:

- `readSpreadsheetData()` - Downloads form data
- `createSheetsClient()` - Initializes Google API client
- `withRetry()` - Implements retry logic with exponential backoff
- `validateGoogleSheetsEnvironment()` - Checks credentials

**Dependencies**: Google APIs, configuration

#### `notionService.js`

**Purpose**: Manages all Notion API operations

**Key Functions**:

- `createNotionClient()` - Initializes Notion client with retry wrapper
- `appendChildrenSafely()` - Safe block appending with validation
- `removeDuplicateToggles()` - Deduplication logic
- `getAllDatabasePages()` - Paginated page fetching
- `findPageByTitle()` - Page lookup by name
- `createTableBlock()`, `createQuoteToggle()` - Block builders

**Dependencies**: Notion API, configuration

### `/src/processors/` - Business Logic Handlers

#### `formClassifier.js`

**Purpose**: Categorizes and validates form submissions

**Key Functions**:

- `classifyFormType()` - Determines form type from intent
- `categorizeAllForms()` - Separates all forms by type
- `validateFormData()` - Checks form completeness
- `filterValidForms()` - Removes invalid submissions
- `getFormStatistics()` - Generates processing metrics

**Dependencies**: Configuration, validation utilities

#### `founderProcessor.js`

**Purpose**: Processes founder and founder referral submissions

**Key Functions**:

- `processFounders()` - Main founder processing orchestrator
- `processSingleFounder()` - Handles individual founder
- `createFounderPage()` - Creates new Notion pages
- `updateFounderPage()` - Updates existing pages
- `buildFounderProperties()` - Constructs Notion properties
- `processUnmatchedReferrals()` - Handles orphaned referrals

**Dependencies**: Services, utilities, configuration

#### `searcherProcessor.js`

**Purpose**: Processes searcher and searcher referral submissions

**Key Functions**:

- `processSearchers()` - Main searcher processing orchestrator
- `processSingleSearcher()` - Handles individual searcher
- `createSearcherPage()` - Creates new Notion pages
- `updateSearcherPageContent()` - Updates page content
- `processUnmatchedSearcherReferrals()` - Handles orphaned referrals

**Dependencies**: Services, utilities, configuration

### `/src/utils/` - Utility Functions

#### `textUtils.js`

**Purpose**: Text processing and normalization

**Key Functions**:

- `normalizeName()` - Basic name normalization
- `normalizeText()` - Advanced text normalization with Unicode handling
- `hasContent()` - Checks for meaningful content
- `countFilledFields()` - Counts non-empty fields
- `getFormResponse()` - Extracts and cleans form responses

**No Dependencies**: Pure utility functions

#### `matchingUtils.js`

**Purpose**: Data matching and comparison

**Key Functions**:

- `findBestMatch()` - Fuzzy string matching with Levenshtein distance
- `isStringMatch()` - Boolean similarity check
- `createKeyMapping()` - Builds lookup tables
- `findMatchingReferrals()` - Finds referrals for entities
- `debugSearcherReferralMatching()` - Debugging and analysis

**Dependencies**: Text utilities, Levenshtein distance library

#### `validationUtils.js`

**Purpose**: Data validation and format conversion

**Key Functions**:

- `validateInternSearcherType()` - Validates searcher/intern designation
- `mapAvailabilityOption()` - Maps availability preferences
- `validateLocation()`, `validateValuation()`, etc. - Field-specific validation
- `validateEmail()`, `validateUrl()`, `validatePhone()` - Format validation
- `parseCommaSeparatedList()` - List parsing

**Dependencies**: Configuration constants

## 🔄 Data Flow

### 1. Initialization Phase

```
Environment Validation → Service Initialization → Credential Verification
```

### 2. Data Collection Phase

```
Google Sheets API → Raw Data Download → Data Integrity Check
```

### 3. Processing Phase

```
Form Classification → Data Validation → Referral Matching → Statistics Generation
```

### 4. Import Phase

```
Notion Connection → Page Creation/Updates → Content Organization → Error Handling
```

### 5. Completion Phase

```
Results Compilation → Statistics Display → Cleanup → Exit
```

## 🔧 Design Patterns

### Service Layer Pattern

- External APIs are abstracted behind service interfaces
- Retry logic and error handling are centralized
- Configuration is separated from implementation

### Strategy Pattern

- Different processors handle different form types
- Validation strategies vary by data type
- Matching algorithms can be swapped

### Factory Pattern

- Block builders create consistent Notion structures
- Client factories handle service initialization
- Property builders construct type-specific data

### Observer Pattern

- Progress logging throughout the pipeline
- Error reporting at each stage
- Statistics collection during processing

## 🛡️ Error Handling Strategy

### Retry Logic

- **Exponential Backoff**: Delays increase with each retry
- **Transient Error Detection**: Identifies retryable conditions
- **Circuit Breaking**: Stops retrying after max attempts

### Graceful Degradation

- **Partial Success**: Continues processing after individual failures
- **Error Isolation**: One form failure doesn't stop others
- **Detailed Logging**: Comprehensive error reporting

### Validation Layers

- **Environment Validation**: Checks configuration before starting
- **Data Validation**: Validates form data before processing
- **API Validation**: Checks responses from external services

## 🔍 Testing Strategy

### Unit Testing

- **Utility Functions**: Pure functions with predictable outputs
- **Validation Logic**: Edge cases and boundary conditions
- **Text Processing**: Unicode handling and normalization

### Integration Testing

- **Service Connections**: API connectivity and authentication
- **Data Processing**: End-to-end form processing
- **Error Scenarios**: Failure mode handling

### Manual Testing

- **Sample Data**: Test with known good/bad data
- **Environment Variations**: Different credential configurations
- **Edge Cases**: Unusual form submissions

## 📊 Performance Considerations

### Rate Limiting

- **Notion API**: 3 requests per second limit
- **Google Sheets**: Generous limits but still monitored
- **Backoff Strategy**: Exponential delays for rate limit errors

### Memory Management

- **Streaming Processing**: Large datasets processed in chunks
- **Garbage Collection**: Explicit cleanup of large objects
- **Memory Monitoring**: Track usage during processing

### Optimization Opportunities

- **Batch Operations**: Group API calls where possible
- **Caching**: Cache frequently accessed data
- **Parallel Processing**: Process independent items concurrently

## 🔒 Security Considerations

### Credential Management

- **Environment Variables**: Never hardcode credentials
- **Minimal Permissions**: Service accounts with least privilege
- **Rotation Strategy**: Regular credential updates

### Data Protection

- **Input Sanitization**: Clean all external data
- **Output Validation**: Verify data before sending to APIs
- **Error Message Sanitization**: Don't leak sensitive data in logs

### API Security

- **HTTPS Only**: All external communications encrypted
- **Token Management**: Secure storage and transmission
- **Audit Logging**: Track all API operations

## 🚀 Deployment Considerations

### Environment Setup

- **Node.js Version**: Specify minimum version requirements
- **Dependencies**: Lock versions for consistency
- **Configuration**: Environment-specific settings

### Monitoring

- **Success Metrics**: Track completion rates
- **Error Tracking**: Monitor failure patterns
- **Performance Metrics**: Response times and throughput

### Maintenance

- **Log Rotation**: Prevent log files from growing too large
- **Credential Updates**: Process for rotating API keys
- **Version Updates**: Strategy for updating dependencies

## 🔄 Extension Points

### Adding New Form Types

1. **Update Constants**: Add new form type mappings
2. **Create Processor**: Implement new processor module
3. **Add Validation**: Create type-specific validation rules
4. **Update Orchestrator**: Integrate into main flow

### Modifying Data Sources

1. **Create Service**: Implement new service interface
2. **Update Configuration**: Add new connection parameters
3. **Modify Processors**: Adapt to new data format
4. **Test Integration**: Verify end-to-end functionality

### Enhancing Matching Logic

1. **Update Utilities**: Modify matching algorithms
2. **Add Configuration**: New matching parameters
3. **Test Accuracy**: Validate matching improvements
4. **Monitor Performance**: Ensure no degradation

This architecture provides a solid foundation for maintaining and extending the Moonstone Importer while keeping it understandable for non-programmers through clear separation of concerns and comprehensive documentation.
