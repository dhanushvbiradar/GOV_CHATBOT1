# Implementation Plan: Citizen Government Services Assistant

## Overview

Incremental implementation of the conversational assistant backend and frontend widget. Each task builds on the previous, starting with data models and core infrastructure, then layering in each service, and finally wiring everything together through the orchestrator and frontend widget.

## Tasks

- [x] 1. Define core TypeScript data models and interfaces
  - Create `GovernmentService`, `Step`, `Scheme`, `EligibilityCriterion`, `DocumentList`, `DocumentEntry`, `Session`, `Message`, `EligibilityInput`, `ChatRequest`, `ChatResponse`, `PageContext`, `NavigationStep` interfaces as specified in the design
  - Define the `IntentType` union type (`GOVT_SERVICE_QA | ELIGIBILITY_DISCOVERY | DOCUMENT_REQUIREMENTS | NAVIGATION_GUIDANCE | PAGE_SUMMARIZATION | FOLLOW_UP | UNKNOWN`)
  - Export all types from a shared `types/index.ts` module
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.2, 7.2_

- [x] 2. Implement Session Manager
  - [x] 2.1 Implement `SessionManager` class backed by Redis with 30-minute sliding TTL
    - `createSession(language)` → `Session`
    - `getSession(sessionId)` → `Session | null`
    - `updateSession(sessionId, patch)` → `Session`
    - `deleteSession(sessionId)` → `void`
    - On TTL expiry or explicit delete, no session data survives
    - _Requirements: 4.1, 4.2, 4.3, 2.6_

  - [ ]* 2.2 Write property test for session ephemerality (Property 8)
    - **Property 8: Session data is ephemeral**
    - **Validates: Requirements 2.6, 4.2**

  - [ ]* 2.3 Write property test for session context follow-up support (Property 11)
    - **Property 11: Session context supports follow-up questions**
    - **Validates: Requirements 4.1**

  - [ ]* 2.4 Write property test for session reset clears history (Property 12)
    - **Property 12: Session reset clears history**
    - **Validates: Requirements 4.3**

  - [ ]* 2.5 Write property test for widget session surviving page reload (Property 16)
    - **Property 16: Widget session survives page reload**
    - **Validates: Requirements 6.5**

  - [ ]* 2.6 Write unit tests for Session Manager
    - Test session creation, retrieval, update, and deletion
    - Test TTL expiry behavior (mock Redis TTL)
    - Test degraded in-memory mode when Redis is unreachable
    - _Requirements: 4.2, 4.4_

- [x] 3. Checkpoint — Ensure all session manager tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Knowledge Base and Document Registry data layer
  - [x] 4.1 Create seed data loader for `GovernmentService` and `Scheme` records in the Knowledge Base
    - Implement `KnowledgeBaseRepository` with `findServiceByQuery(query)`, `findServiceById(id)`, `findSchemeById(id)`, `getAllSchemes()` methods
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.4_

  - [x] 4.2 Create `DocumentRegistryRepository` with `getDocumentList(serviceOrSchemeId)` method
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 4.3 Write property test for document list entries containing required fields (Property 9)
    - **Property 9: Document list entries contain required fields**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 4.4 Write property test for conditional documents including their condition (Property 10)
    - **Property 10: Conditional documents include their condition**
    - **Validates: Requirements 3.3**

  - [ ]* 4.5 Write unit tests for Knowledge Base and Document Registry repositories
    - Test exact match, alias match, multi-match, and no-match scenarios
    - Test missing document list fallback (Req 3.4)
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.4_

- [x] 5. Implement Q&A Service
  - [x] 5.1 Implement `QAService` that looks up a `GovernmentService` in the KB and uses the LLM to generate a step-by-step explanation
    - Handle single match → return ordered steps
    - Handle multiple matches → return `clarification` response with matched service names
    - Handle no match → return fallback with related service suggestions or help link
    - Handle step drill-down (Req 1.5) using `expandedDetail` field
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ]* 5.2 Write property test for service query returning structured steps (Property 1)
    - **Property 1: Service query returns structured steps**
    - **Validates: Requirements 1.1**

  - [ ]* 5.3 Write property test for ambiguous query triggering clarification (Property 2)
    - **Property 2: Ambiguous query triggers clarification**
    - **Validates: Requirements 1.2**

  - [ ]* 5.4 Write property test for unrecognized query returning fallback with suggestions (Property 3)
    - **Property 3: Unrecognized query returns fallback with suggestions**
    - **Validates: Requirements 1.3**

  - [ ]* 5.5 Write property test for step drill-down returning expanded detail (Property 4)
    - **Property 4: Step drill-down returns expanded detail**
    - **Validates: Requirements 1.5**

  - [ ]* 5.6 Write unit tests for Q&A Service
    - Test known service query (e.g., passport application) returns correct steps
    - Test LLM timeout fallback to template-based response
    - _Requirements: 1.1, 1.4_

- [x] 6. Implement Eligibility Engine
  - [x] 6.1 Implement `EligibilityEngine` that evaluates `EligibilityInput` against `EligibilityCriterion` rules for all schemes
    - Support operators: `lt`, `lte`, `gt`, `gte`, `eq`, `in`
    - Return only schemes where all criteria are satisfied
    - Detect missing required fields and return a prompt for them before evaluating
    - Never write eligibility inputs to persistent storage
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 6.2 Implement scheme detail lookup returning purpose, benefit description, and official portal URL
    - _Requirements: 2.4_

  - [ ]* 6.3 Write property test for eligibility results satisfying all criteria (Property 5)
    - **Property 5: Eligibility results satisfy all criteria**
    - **Validates: Requirements 2.1**

  - [ ]* 6.4 Write property test for incomplete eligibility input prompting for missing fields (Property 7)
    - **Property 7: Incomplete eligibility input prompts for missing fields**
    - **Validates: Requirements 2.5**

  - [ ]* 6.5 Write property test for scheme detail response containing required fields (Property 6)
    - **Property 6: Scheme detail response contains required fields**
    - **Validates: Requirements 2.4**

  - [ ]* 6.6 Write unit tests for Eligibility Engine
    - Test each operator type
    - Test no-match scenario (Req 2.2)
    - Test minimum-data principle: only required fields are requested (Req 2.3)
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 7. Checkpoint — Ensure all Q&A and eligibility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Document Registry Service
  - [x] 8.1 Implement `DocumentRegistryService` wrapping the repository
    - Return structured `DocumentList` with mandatory/conditional classification
    - Return "not found" response with official portal link when document info is unavailable
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 8.2 Write unit tests for Document Registry Service
    - Test mandatory vs. conditional document rendering
    - Test unavailable document info fallback
    - _Requirements: 3.4, 3.5_

- [x] 9. Implement Navigation Service
  - [x] 9.1 Implement `NavigationService` that accepts an action query and `PageContext`, returns ordered `NavigationStep[]` referencing specific UI elements
    - Fall back to closest matching service path when exact action not found on page
    - Include direct link to official portal when available
    - _Requirements: 6.2, 6.3, 6.4, 6.7, 6.8_

  - [ ]* 9.2 Write property test for navigation response containing ordered steps with element references (Property 14)
    - **Property 14: Navigation response contains ordered steps with element references**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 9.3 Write property test for portal link present when service has known portal URL (Property 15)
    - **Property 15: Portal link present when service has known portal URL**
    - **Validates: Requirements 6.7**

  - [ ]* 9.4 Write unit tests for Navigation Service
    - Test known page action returns correct steps with element labels
    - Test fallback when action not found on page
    - _Requirements: 6.8_

- [x] 10. Implement Page Summarizer
  - [x] 10.1 Implement `PageSummarizer` that accepts `PageContext` (visible text + form fields) and uses the LLM to produce a structured summary
    - Summary must cover: page purpose, main actions, key inputs required, form steps if present
    - Highlight required fields, document upload areas, payment steps, submission buttons
    - Return low-confidence fallback when page content is too short or ambiguous
    - Must complete within 5 seconds (enforce timeout)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 10.2 Write property test for page summary addressing purpose, actions, and required inputs (Property 17)
    - **Property 17: Page summary addresses purpose, actions, and required inputs**
    - **Validates: Requirements 7.2**

  - [ ]* 10.3 Write unit tests for Page Summarizer
    - Test form-containing page produces form steps in summary
    - Test low-confidence fallback when content is too short
    - Test 5-second timeout enforcement
    - _Requirements: 7.4, 7.6, 7.7_

- [x] 11. Implement Intent Classifier and Query Router
  - [x] 11.1 Implement `IntentClassifier` using a lightweight LLM classification prompt to map citizen messages to `IntentType`
    - Handle `FOLLOW_UP` intent by resolving against session history
    - Return `UNKNOWN` with confidence score when below threshold; trigger rephrase prompt
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.2, 7.1_

  - [x] 11.2 Implement `QueryRouter` that dispatches classified intents to the correct core service
    - _Requirements: 1.1, 2.1, 3.1, 6.2, 7.1_

  - [ ]* 11.3 Write unit tests for Intent Classifier and Query Router
    - Test each intent type routes to the correct service
    - Test `UNKNOWN` intent triggers rephrase prompt
    - Test `FOLLOW_UP` resolution using session history
    - _Requirements: 4.1_

- [x] 12. Implement Orchestrator Service
  - [x] 12.1 Implement `OrchestratorService` that coordinates the full request lifecycle
    - Load or create session via `SessionManager`
    - Classify intent via `IntentClassifier`
    - Dispatch to `QueryRouter`
    - Merge response with session context and persist updated session
    - Enforce 4.5-second service timeout with retry prompt fallback
    - Handle LLM failure with template-based fallback
    - Handle session store unavailability with in-memory degraded mode
    - Catch unhandled exceptions, log without PII, preserve session history, return error response
    - Handle explicit session reset: clear history, confirm to citizen
    - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 12.2 Write unit tests for Orchestrator
    - Test correct service dispatch for each intent
    - Test 4.5-second timeout triggers error response
    - Test session reset flow
    - Test error handling preserves session history
    - _Requirements: 4.4_

- [x] 13. Implement API Gateway layer
  - [x] 13.1 Implement `POST /api/v1/chat` endpoint wiring `ChatRequest` → Orchestrator → `ChatResponse`
    - Add API key / JWT auth middleware
    - Add rate limiting middleware
    - _Requirements: 1.4_

  - [ ]* 13.2 Write unit tests for API Gateway
    - Test auth rejection on missing/invalid credentials
    - Test rate limiting response
    - Test valid request returns `ChatResponse` shape
    - _Requirements: 1.4_

- [x] 14. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement language support in Orchestrator and services
  - [x] 15.1 Add language detection and preference handling to the Orchestrator
    - Detect language from citizen message; fall back to session language preference
    - Persist language preference in session
    - Respond in the same language as the citizen's message (Req 5.2)
    - Respond in native script for Hindi (Devanagari) and other regional languages without transliteration (Req 5.6, 5.7)
    - On unsupported language: respond in default language and list supported languages (Req 5.3)
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7_

  - [ ]* 15.2 Write property test for language preference persisting across session messages (Property 13)
    - **Property 13: Language preference persists across session messages**
    - **Validates: Requirements 5.2, 5.5**

  - [ ]* 15.3 Write unit tests for language handling
    - Test Hindi response uses Devanagari script
    - Test unsupported language returns default language response with supported language list
    - Test explicit language selection overrides auto-detection
    - _Requirements: 5.3, 5.6, 5.7, 5.8_

- [x] 16. Implement Chatbot Widget (Frontend)
  - [x] 16.1 Implement the self-contained web component / browser extension content script
  - [x] 16.2 Implement language selection UI in the widget
  - [x] 16.3 Implement page content extractor
  - [x] 16.4 Implement UI element highlighting

  - [ ]* 16.5 Write unit tests for Chatbot Widget
    - Test `sessionId` persists across simulated page reloads via `sessionStorage`
    - Test page content extractor captures visible text and form fields
    - Test highlight targets are applied to correct DOM elements
    - _Requirements: 6.5_

- [x] 17. Final checkpoint — Wire everything together and ensure all tests pass
  - Confirm `POST /api/v1/chat` end-to-end flow: widget → API Gateway → Orchestrator → core service → response rendered in widget
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations each
- Each property test must include a comment: `// Feature: citizen-govt-services-assistant, Property N: <property_text>`
- Session Manager targets 95% line coverage; core services target 90%; Orchestrator 85%
- No personal data (eligibility inputs) is ever written to persistent storage — enforced at the Eligibility Engine and Session Manager layers
