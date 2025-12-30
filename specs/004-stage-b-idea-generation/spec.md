# Feature Specification: Stage B - Idea Generation

**Feature Branch**: `004-stage-b-idea-generation`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "Stage B development with priority. AI agent will be provided via separate API, so only UI and backend need to be developed."

## Overview

Stage B is the core value-creation stage of the AI Agent Business Builder service. After users select a market problem in Stage A (Discovery), they proceed to Stage B where an AI agent generates business ideas targeting that problem. The AI agent functionality is provided via a separate API endpoint, so this feature focuses on the UI and backend integration layer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Idea Generation Request (Priority: P1)

Authenticated users who selected a problem in Stage A can request the AI agent to generate business ideas. The system displays a loading state while the AI processes the request, then shows the generated ideas.

**Why this priority**: Core functionality of Stage B. Without idea generation, users cannot derive value from the problem they selected. This is the primary conversion point where free browsing turns into actionable business insights.

**Independent Test**: Log in, select a problem from Stage A, and verify that clicking "Generate Ideas" triggers the AI agent and displays results.

**Acceptance Scenarios**:

1. **Given** authenticated user has selected a problem from Stage A, **When** they land on Stage B page, **Then** the selected problem summary is displayed with a "Generate Ideas" button
2. **Given** user is on Stage B with selected problem, **When** they click "Generate Ideas" button, **Then** loading indicator appears and generation request is sent to AI agent API
3. **Given** AI agent is processing the request, **When** processing completes successfully, **Then** generated ideas are displayed in a readable format
4. **Given** AI agent returns multiple ideas, **When** ideas are displayed, **Then** each idea shows title, description, target audience, and key differentiators

---

### User Story 2 - Idea Viewing and Exploration (Priority: P1)

Users can view generated ideas in detail, expand individual ideas for more information, and navigate between multiple generated ideas.

**Why this priority**: Essential for users to understand and evaluate the AI-generated ideas. Without proper viewing, the generated content has no practical value.

**Independent Test**: Generate ideas and verify that each idea can be expanded to show full details.

**Acceptance Scenarios**:

1. **Given** ideas have been generated, **When** user views the idea list, **Then** each idea is displayed as a card with title and brief summary
2. **Given** idea cards are displayed, **When** user clicks on an idea card, **Then** expanded view shows full details including description, target audience, market opportunity, and implementation hints
3. **Given** multiple ideas are generated, **When** user navigates between ideas, **Then** they can easily browse all generated ideas

---

### User Story 3 - Regenerate Ideas (Priority: P2)

Users can request new ideas if the initially generated ones don't meet their needs. They can optionally provide feedback or constraints to guide the regeneration.

**Why this priority**: Important for user satisfaction but MVP can function with single generation. Users may need multiple attempts to find valuable ideas.

**Independent Test**: After initial generation, click "Regenerate" and verify new ideas are generated.

**Acceptance Scenarios**:

1. **Given** ideas have been generated, **When** user clicks "Regenerate Ideas" button, **Then** new set of ideas is generated for the same problem
2. **Given** user wants to guide regeneration, **When** they provide optional feedback text before regenerating, **Then** AI agent considers the feedback in generating new ideas
3. **Given** regeneration is in progress, **When** new ideas are ready, **Then** previous ideas are replaced with new ones

---

### User Story 4 - Save Favorite Ideas (Priority: P2)

Users can save ideas they find valuable for future reference. Saved ideas are accessible from their profile or a dedicated "My Ideas" page.

**Why this priority**: Enhances user engagement and retention by allowing users to build a collection of ideas. Not essential for MVP but important for long-term usage.

**Independent Test**: Generate ideas, save one, then verify it appears in saved ideas list.

**Acceptance Scenarios**:

1. **Given** ideas are displayed, **When** user clicks "Save" on an idea, **Then** the idea is saved to their account
2. **Given** user has saved ideas, **When** they access "My Ideas" page, **Then** all saved ideas are listed with problem context
3. **Given** user views saved ideas, **When** they click on a saved idea, **Then** full idea details are displayed

---

### User Story 5 - Generation History (Priority: P3)

Users can view their past idea generation sessions, allowing them to revisit previously generated ideas for different problems.

**Why this priority**: Nice-to-have feature for user convenience. Can be deferred to later iterations.

**Independent Test**: Generate ideas for multiple problems, then verify history shows all sessions.

**Acceptance Scenarios**:

1. **Given** user has generated ideas for multiple problems, **When** they access generation history, **Then** list of past sessions is displayed with problem titles and dates
2. **Given** history list is displayed, **When** user clicks on a past session, **Then** the generated ideas from that session are shown

---

### Edge Cases

- What happens when AI agent API is unavailable or times out?
- How to handle when AI agent returns empty or invalid response?
- What happens when user navigates away during generation?
- How to handle concurrent generation requests from same user?
- What happens when user's session expires during generation?
- How to handle when selected problem data is no longer available?

## Requirements *(mandatory)*

### Functional Requirements

**Idea Generation**
- **FR-001**: System MUST accept problem context from Stage A and pass it to AI agent API
- **FR-002**: System MUST display loading state while AI agent processes the request
- **FR-003**: System MUST display generated ideas in structured format (title, description, target audience, differentiators)
- **FR-004**: System MUST support generating 3-5 ideas per request
- **FR-005**: System MUST handle AI agent API errors gracefully with user-friendly messages

**Idea Viewing**
- **FR-006**: System MUST display idea list with expandable cards
- **FR-007**: System MUST show full idea details on expansion (description, target audience, market opportunity, implementation hints)
- **FR-008**: System MUST allow users to navigate between multiple generated ideas

**Regeneration**
- **FR-009**: System MUST allow users to regenerate ideas for the same problem
- **FR-010**: System MUST accept optional user feedback to guide regeneration
- **FR-011**: System MUST replace previous ideas with newly generated ones on regeneration

**Saving Ideas**
- **FR-012**: Authenticated users MUST be able to save ideas to their account
- **FR-013**: System MUST provide access to saved ideas via "My Ideas" page
- **FR-014**: System MUST associate saved ideas with original problem context

**Access Control**
- **FR-015**: Stage B MUST be accessible only to authenticated users
- **FR-016**: System MUST redirect unauthenticated users to login
- **FR-017**: System MUST preserve selected problem context after login redirect

**History**
- **FR-018**: System MUST record idea generation sessions for each user
- **FR-019**: System MUST allow users to view past generation sessions

### Key Entities

- **GenerationSession**: A single idea generation request (session ID, user ID, problem ID, timestamp, status)
- **GeneratedIdea**: An individual idea from AI agent (idea ID, session ID, title, description, target audience, differentiators, market opportunity, implementation hints)
- **SavedIdea**: User's saved idea reference (saved ID, user ID, idea ID, saved timestamp, notes)
- **Problem**: Reference to problem selected from Stage A (from 001-data-pipeline)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 80% or more of users who start idea generation receive results successfully
- **SC-002**: Idea generation completes within 30 seconds for 95% of requests
- **SC-003**: 60% or more of users view at least 2 generated ideas in detail
- **SC-004**: 30% or more of users save at least 1 idea
- **SC-005**: 20% or more of users use the regeneration feature
- **SC-006**: System handles 500 concurrent generation requests
- **SC-007**: Average user rates generated ideas as "useful" or better (3+ on 5-point scale) for 70% of sessions

## Assumptions

- AI agent API is provided as a separate service with defined endpoint and response format
- AI agent API accepts problem context (title, keywords, domain, trend, sentiment) and returns structured ideas
- AI agent API response time is typically under 20 seconds
- Each generation request produces 3-5 ideas
- Users must complete Stage A (problem selection) before accessing Stage B
- Problem data from Stage A is passed via URL parameter or session storage
- Saved ideas persist indefinitely until user deletes them
- Generation history is retained for 90 days

## Dependencies

- **003-discovery-ui-auth**: User authentication and problem selection from Stage A
- **001-data-pipeline**: Problem data structure and content
- **AI Agent API**: External API for idea generation (endpoint TBD)

## Out of Scope

- AI agent development and training (provided via separate API)
- Idea sharing between users
- Idea export functionality (PDF, etc.)
- Collaborative idea refinement
- Integration with Stage C (Solution Design)
- Payment for premium generation features
- Analytics dashboard for generation quality
