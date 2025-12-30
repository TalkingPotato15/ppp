# Feature Specification: Stage A Discovery UI with User Authentication

**Feature Branch**: `003-discovery-ui-auth`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "Stage A Discovery UI + User Authentication feature development. Mobile uses infinite scroll, desktop uses pagination for card loading."

## Overview

The first user touchpoint for the AI Agent Business Builder service. Users can browse market problem data collected and analyzed by 001-data-pipeline in card format, and select problems of interest to proceed to Stage B (Idea Generation). Only authenticated users can select problems and proceed to subsequent stages.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Problem Card Browsing (Priority: P1)

Unauthenticated users can access the service and freely browse market problem cards. Each card displays the problem title, keywords, and trend indicator. Clicking a card shows a preview with summary information.

**Why this priority**: Core value proposition of the service. This is the user's first experience discovering real market problems. Users must be able to experience value without signing up to enable user acquisition.

**Independent Test**: Access the main page without logging in and verify that problem card list is displayed and scrolling/filtering works

**Acceptance Scenarios**:

1. **Given** user accesses the service main page, **When** the page loads, **Then** problem cards are displayed in grid/list format
2. **Given** problem card list is displayed, **When** user clicks a specific card, **Then** preview showing problem summary (title, keywords, trend, sentiment) is displayed
3. **Given** there are many problem cards on mobile device, **When** user scrolls down, **Then** additional cards load automatically via infinite scroll
4. **Given** there are many problem cards on desktop device, **When** user navigates pages, **Then** additional cards load via pagination controls
5. **Given** user switches between mobile and desktop views, **When** the viewport changes, **Then** the loading mechanism adapts accordingly (infinite scroll vs pagination)

---

### User Story 2 - Registration and Login (Priority: P1)

Users can create an account and log in using email and password. Social login (Google) is also supported for quick registration.

**Why this priority**: Essential foundation for problem selection and paid feature usage. Without authentication, user-specific purchase history management and payments are impossible.

**Independent Test**: Register with a new email, then log in and verify that authentication state is maintained

**Acceptance Scenarios**:

1. **Given** unauthenticated user accesses registration page, **When** they enter valid email and password and submit, **Then** account is created and user is logged in
2. **Given** existing member accesses login page, **When** they enter correct credentials, **Then** they are logged in and redirected to main page
3. **Given** user clicks social login button, **When** they authenticate with Google account, **Then** account is automatically created/linked and they are logged in
4. **Given** incorrect password is entered, **When** login is attempted, **Then** error message is displayed and login is rejected

---

### User Story 3 - Problem Selection and Stage B Progression (Priority: P1)

Logged-in users can select a problem card of interest and proceed to Stage B (Idea Generation). When unauthenticated users attempt to select, a login prompt is displayed.

**Why this priority**: Critical conversion point in user journey. Entry point from free browsing to paid service.

**Independent Test**: Log in and verify that selecting a problem card navigates to Stage B page

**Acceptance Scenarios**:

1. **Given** logged-in user is viewing problem card preview, **When** they click "Generate Ideas for This Problem" button, **Then** they navigate to Stage B page with selected problem information
2. **Given** unauthenticated user is viewing problem card preview, **When** they click "Generate Ideas for This Problem" button, **Then** login/registration modal is displayed
3. **Given** unauthenticated user completes login in the modal, **When** authentication succeeds, **Then** Stage B progression with originally selected problem continues automatically

---

### User Story 4 - Problem Card Filtering and Search (Priority: P2)

Users can filter or search problem cards by domain, trend, sentiment, and keywords.

**Why this priority**: User experience enhancement. Helps users quickly find areas of interest among many problems, but MVP is viable with basic browsing alone.

**Independent Test**: Select filter options and verify only matching cards are displayed

**Acceptance Scenarios**:

1. **Given** problem card list is displayed, **When** trend filter is set to "Rising", **Then** only rising trend problems are displayed
2. **Given** search box is displayed, **When** keyword is entered and search is executed, **Then** only problem cards containing that keyword are displayed
3. **Given** multiple filters are applied, **When** "Reset Filters" button is clicked, **Then** all filters are cleared and all cards are displayed

---

### User Story 5 - Password Reset (Priority: P2)

Users who forgot their password can reset it via email.

**Why this priority**: Basic account management feature. Without it, user churn occurs, but initially can be handled manually.

**Independent Test**: Receive password reset email and verify successful login with new password

**Acceptance Scenarios**:

1. **Given** user clicks "Forgot Password" on login page, **When** registered email is entered, **Then** email with password reset link is sent
2. **Given** user clicks link in reset email, **When** new password is entered and submitted, **Then** password is changed and user is redirected to login page

---

### User Story 6 - Profile Management (Priority: P3)

Logged-in users can view and edit their profile information.

**Why this priority**: Supplementary feature. Not directly related to core service value and can be implemented later.

**Independent Test**: Verify nickname change saves successfully on profile page

**Acceptance Scenarios**:

1. **Given** logged-in user accesses profile page, **When** page loads, **Then** current profile information (email, nickname) is displayed
2. **Given** user is in profile edit mode, **When** nickname is changed and saved, **Then** changed information is saved and confirmation message is displayed

---

### Edge Cases

- How to handle duplicate registration attempt with same email?
- How to handle when social login account and regular account have same email?
- How to notify user when session expires?
- How to display when problem card data is missing or fails to load?
- How to handle when password reset link has expired?
- How to handle sessions when logging in from multiple devices simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

**Discovery UI**
- **FR-001**: System MUST display problem data collected from 001-data-pipeline in card format
- **FR-002**: Each problem card MUST display title, keywords (up to 5), trend indicator, and sentiment indicator
- **FR-003**: Users MUST be able to click problem cards to view detailed preview
- **FR-004**: System MUST provide filtering functionality by domain, trend, sentiment, and keywords
- **FR-005**: System MUST provide keyword search functionality
- **FR-006**: Problem cards MUST load via infinite scroll on mobile devices
- **FR-007**: Problem cards MUST load via pagination controls on desktop devices
- **FR-008**: System MUST detect device type and apply appropriate loading mechanism

**User Authentication**
- **FR-009**: System MUST support email/password-based registration
- **FR-010**: System MUST support Google social login
- **FR-011**: System MUST validate email format and password strength
- **FR-012**: System MUST provide password reset email functionality
- **FR-013**: System MUST maintain login state and manage sessions
- **FR-014**: System MUST provide logout functionality

**Access Control**
- **FR-015**: Unauthenticated users MUST be able to browse problem cards
- **FR-016**: Problem selection and Stage B progression MUST be available only to logged-in users
- **FR-017**: System MUST display login prompt when unauthenticated users access protected features
- **FR-018**: System MUST automatically return to intended action after login

### Key Entities

- **User**: Service user (user ID, email, nickname, authentication method, registration date, last login)
- **ProblemCard**: Market problem card (problem ID, title, keyword list, domain, trend, sentiment, source URL, publication date)
- **Session**: User session (session ID, user ID, creation time, expiration time, device information)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 70% or more of new visitors view at least 3 problem cards
- **SC-002**: 80% or more of users who start registration complete it
- **SC-003**: Registration completes in under 2 minutes on average
- **SC-004**: 95% or more of login attempts complete within 3 seconds
- **SC-005**: Problem card list loads within 2 seconds
- **SC-006**: Search/filter results display within 1 second
- **SC-007**: System supports 1000 concurrent users
- **SC-008**: 10% or more of users who view problem cards proceed to Stage B

## Assumptions

- Data collected from 001-data-pipeline already exists in RDB (DocumentSummary) and Vector DB
- Initial PoC displays problems from single domain (real estate) only
- Social login supports only Google; expandable to Apple/Kakao later
- Password policy: minimum 8 characters, alphanumeric combination required
- Session duration: 7 days (30 days if "remember me" selected)
- Email verification omitted in initial PoC (can be added later)
- Mobile device detection based on viewport width (breakpoint at 768px)
- Infinite scroll loads 20 cards per batch
- Pagination displays 12 cards per page

## Dependencies

- **001-data-pipeline**: Problem card data source (DocumentSummary table)
- **Email Service**: Password reset email delivery
- **Google OAuth**: Social login authentication

## Out of Scope

- Additional social logins (Apple/Kakao, etc.) - future expansion
- Email verification (email confirmation on registration)
- Two-factor authentication (2FA)
- Admin dashboard
- Account deletion feature (handled manually initially)
- Multi-language support
