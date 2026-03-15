# Requirements Document

## Introduction

A citizen-facing conversational assistant that helps users navigate government services. The assistant answers questions about service processes, identifies eligible government schemes based on user-provided details, and lists required documents with links to official portals. The goal is to reduce friction for citizens trying to understand and access government services.

## Glossary

- **Assistant**: The AI-powered chatbot that interacts with citizens via a conversational interface.
- **Citizen**: An end user interacting with the Assistant to access information about government services.
- **Government_Service**: A public-sector service (e.g., passport application, driving license renewal) that a citizen may need to access.
- **Scheme**: A government-sponsored program or benefit (e.g., subsidies, welfare programs) that citizens may qualify for based on eligibility criteria.
- **Eligibility_Criteria**: A set of conditions (e.g., age, income, residency) that determine whether a Citizen qualifies for a Scheme.
- **Document_List**: A structured list of documents required to apply for a Government_Service or Scheme.
- **Official_Portal**: A government-operated website or online platform where citizens can submit applications or access authoritative information.
- **Session**: A single continuous interaction between a Citizen and the Assistant.

---

## Requirements

### Requirement 1: Answer Questions About Government Services

**User Story:** As a citizen, I want to ask questions about government services so that I can easily understand application processes.

#### Acceptance Criteria

1. WHEN a Citizen submits a query about a Government_Service, THE Assistant SHALL respond with a step-by-step description of the application process for that service.
2. WHEN a Citizen submits a query that matches multiple Government_Services, THE Assistant SHALL present a clarifying prompt listing the matched services and ask the Citizen to select one before proceeding.
3. IF the Assistant cannot identify a Government_Service matching the Citizen's query, THEN THE Assistant SHALL inform the Citizen that the service was not found and suggest related services or direct the Citizen to a general help resource.
4. THE Assistant SHALL respond to each Citizen query within 5 seconds under normal operating conditions.
5. WHEN a Citizen requests more detail on a specific step, THE Assistant SHALL provide an expanded explanation of that step.

---

### Requirement 2: Scheme Eligibility Discovery

**User Story:** As a citizen, I want to discover government schemes so that I can know which schemes I qualify for.

#### Acceptance Criteria

1. WHEN a Citizen provides personal details relevant to Eligibility_Criteria (such as age, income range, or residency status), THE Assistant SHALL evaluate those details against known Scheme eligibility rules and return a list of Schemes the Citizen qualifies for.
2. WHEN no Schemes match the Citizen's provided details, THE Assistant SHALL inform the Citizen that no matching Schemes were found and suggest the Citizen verify their details or contact a government helpline.
3. THE Assistant SHALL request only the minimum personal details necessary to evaluate Eligibility_Criteria for the Schemes being considered.
4. WHEN a Citizen asks for details about a specific Scheme from the eligibility results, THE Assistant SHALL provide a summary of the Scheme including its purpose, benefit amount or type, and a link to the Official_Portal.
5. IF a Citizen provides incomplete personal details required for eligibility evaluation, THEN THE Assistant SHALL prompt the Citizen to supply the missing details before returning results.
6. THE Assistant SHALL NOT store personal details provided by the Citizen beyond the duration of the active Session.

---

### Requirement 3: Document Requirements for Services

**User Story:** As a citizen, I want to know required documents for services so that I can prepare applications correctly.

#### Acceptance Criteria

1. WHEN a Citizen asks about document requirements for a Government_Service or Scheme, THE Assistant SHALL return the Document_List for that service or scheme.
2. THE Document_List SHALL include, for each required document, the document name, a brief description of its purpose, and a link to the relevant Official_Portal where the document can be obtained or submitted.
3. WHEN a Government_Service or Scheme has conditional document requirements (i.e., documents required only under certain circumstances), THE Assistant SHALL indicate the condition under which each conditional document is required.
4. IF the document information for a requested Government_Service is unavailable, THEN THE Assistant SHALL inform the Citizen and provide a link to the Official_Portal for that service.
5. WHEN a Citizen requests a Document_List, THE Assistant SHALL present the list in a structured, readable format distinguishing mandatory documents from conditional documents.

---

### Requirement 4: Session and Conversation Management

**User Story:** As a citizen, I want a coherent conversational experience so that I can ask follow-up questions without repeating context.

#### Acceptance Criteria

1. WHILE a Session is active, THE Assistant SHALL retain the context of prior exchanges within that Session to support follow-up questions without requiring the Citizen to repeat previously provided information.
2. WHEN a Session ends or times out after 30 minutes of inactivity, THE Assistant SHALL discard all Citizen-provided data from that Session.
3. WHEN a Citizen explicitly requests to start a new conversation, THE Assistant SHALL reset the Session context and confirm the reset to the Citizen.
4. IF a Session experiences a technical error, THEN THE Assistant SHALL notify the Citizen of the error, preserve the conversation history up to that point where possible, and prompt the Citizen to retry.

---

### Requirement 5: Accessibility and Language Support

**User Story:** As a citizen, I want to interact with the assistant in my preferred language so that I can understand responses without language barriers.

#### Acceptance Criteria

1. THE Assistant SHALL support interaction in a minimum of two languages as configured by the deploying government authority.
2. WHEN a Citizen submits a query in a supported language, THE Assistant SHALL respond in the same language.
3. IF a Citizen submits a query in an unsupported language, THEN THE Assistant SHALL respond in the default configured language and inform the Citizen of the supported languages.
4. THE Assistant SHALL conform to WCAG 2.1 Level AA accessibility guidelines for any web-based interface through which it is accessed.

5. WHEN a Citizen selects a preferred language, THE Assistant SHALL respond in that language using its native script for the remainder of the Session unless the Citizen changes the preference.

6. WHEN the preferred language is Hindi, THE Assistant SHALL respond in Devanagari script and SHALL NOT transliterate the response into English letters unless the Citizen explicitly requests transliteration.

7. WHEN the preferred language is another supported regional language, THE Assistant SHALL respond in that language’s standard native script and SHALL NOT use English-script transliteration unless explicitly requested by the Citizen.

8. THE interface SHALL allow the Citizen to choose a preferred language explicitly, independent of automatic language detection.
---

### Requirement 6: Website Navigation Guidance

**User Story:**
As a citizen using a government website, I want the Assistant to guide me through the website interface so that I can quickly find and complete the service I need without reading the entire page.

#### Acceptance Criteria

1. WHEN a Citizen opens a page on the government website, THE Assistant SHALL be available as a chatbot widget in the corner of the interface.

2. WHEN a Citizen asks how to perform an action (for example "How do I apply for a passport?"), THE Assistant SHALL provide step-by-step navigation instructions indicating which links or buttons on the current page the Citizen should click.

3. WHEN possible, THE Assistant SHALL highlight or reference specific interface elements such as:

   * buttons
   * navigation menu items
   * form fields
   * links to application portals

4. IF the requested action requires navigating to another page, THE Assistant SHALL provide the exact navigation path, including which menu or link to select.

5. WHEN a page reload occurs, THE Assistant SHALL remain accessible and continue the conversation within the active Session.

6. THE Assistant SHALL provide concise guidance optimized for quick navigation, prioritizing short actionable instructions such as:

   * "Click 'Apply Online'"
   * "Select 'New Driving License'"
   * "Upload your Aadhaar card"

7. THE Assistant SHALL provide a direct link to the relevant Official_Portal or application page when available.

8. IF the Assistant cannot identify the requested action on the current page, THEN it SHALL provide the closest matching service and guide the Citizen to the correct section of the website.

Requirement 7: Government Website Page Summarization

User Story:
As a citizen browsing a government website, I want the Assistant to summarize the content of the current page so that I can quickly understand its purpose and required actions.

Acceptance Criteria

WHEN a Citizen opens a page on a recognized government website, THE Assistant SHALL analyze the visible content of the page.

THE Assistant SHALL generate a concise summary explaining:

the purpose of the page

the main actions available

the key information the Citizen must provide

THE summary SHALL be presented in clear and simple language suitable for citizens unfamiliar with government terminology.

WHEN the page contains a form, THE Assistant SHALL summarize the steps required to complete the form.

THE Assistant SHALL highlight important sections such as:

required fields

document upload areas

payment steps

submission buttons

IF the Assistant cannot confidently determine the purpose of the page, THEN it SHALL inform the Citizen and allow the Citizen to ask a question about the page content.

THE summary SHALL be generated within 5 seconds of the page being loaded.