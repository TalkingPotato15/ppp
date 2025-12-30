# Feature Specification: Stage A Discovery UI with User Authentication

**Feature Branch**: `003-discovery-ui-auth`
**Created**: 2025-12-29
**Updated**: 2025-12-30
**Status**: Draft
**Input**: User description: "Stage A Discovery UI + User Authentication feature development. Mobile uses infinite scroll, desktop uses pagination for card loading." + "Google OAuth authentication with AuthIdentity mapping, secure onboarding flow, and account linking."

## Overview

The first user touchpoint for the AI Agent Business Builder service. Users can browse market problem data collected and analyzed by 001-data-pipeline in card format, and select problems of interest to proceed to Stage B (Idea Generation). Only authenticated users can select problems and proceed to subsequent stages.

Authentication is identity-based using AuthIdentity mapping (provider, issuer, provider_user_id) rather than email-based matching, ensuring secure account management and preventing unauthorized account merges.

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

### User Story 2 - Email/Password Registration and Login (Priority: P1)

Users can create an account and log in using email and password.

**Why this priority**: Essential foundation for problem selection and paid feature usage. Without authentication, user-specific purchase history management and payments are impossible.

**Independent Test**: Register with a new email, then log in and verify that authentication state is maintained

**Acceptance Scenarios**:

1. **Given** unauthenticated user accesses registration page, **When** they enter valid email and password and submit, **Then** account is created and user is logged in
2. **Given** existing member accesses login page, **When** they enter correct credentials, **Then** they are logged in and redirected to main page
3. **Given** incorrect password is entered, **When** login is attempted, **Then** error message is displayed and login is rejected

---

### User Story 2a - New User Sign Up with Google (Priority: P1)

A new user visits the service for the first time and wants to sign up using their Google account. They click "Sign up with Google" button, authenticate with Google, and are directed to an onboarding flow where they provide additional profile information (username/nickname) before their account is fully created.

**Why this priority**: This is the primary user acquisition flow. Without new user registration, the service cannot grow its user base. It establishes the core AuthIdentity mapping pattern that all other flows depend on.

**Independent Test**: Can be fully tested by clicking "Sign up with Google", completing Google OAuth, filling in username on onboarding screen, and verifying user can access the service with a new account.

**Acceptance Scenarios**:

1. **Given** a new user with no existing account, **When** they click "Sign up with Google" and complete Google authentication, **Then** they are directed to the onboarding screen with their Google email pre-filled and locked.
2. **Given** a user on the onboarding screen, **When** they enter a valid username and submit, **Then** their account is created with ACTIVE status and they receive a session/token to access the service.
3. **Given** a user on the onboarding screen, **When** they try to modify the email field, **Then** the field is disabled and they cannot change the Google-provided email.

---

### User Story 2b - Returning User Sign In with Google (Priority: P1)

A returning user who previously registered with Google wants to sign back into the service. They click "Sign in with Google", authenticate, and are immediately logged in without any additional steps.

**Why this priority**: This is the primary returning user flow. Fast and frictionless re-authentication is essential for user retention and daily active usage.

**Independent Test**: Can be fully tested by having an existing Google-registered user click "Sign in with Google", complete Google OAuth, and verify immediate access to their account without onboarding.

**Acceptance Scenarios**:

1. **Given** a user with an existing AuthIdentity mapping for their Google account, **When** they click "Sign in with Google" and complete Google authentication, **Then** they are immediately issued a session/token and redirected to the main application.
2. **Given** a user with an existing account, **When** the id_token passes all validations (signature, iss, aud, exp), **Then** the system looks up AuthIdentity by (provider="google", provider_user_id=sub) and logs them in.

---

### User Story 2c - Resume Interrupted Google Onboarding (Priority: P2)

A user started the Google sign-up process but abandoned the onboarding screen before completing it. When they return and authenticate with Google again, they should resume where they left off instead of starting over.

**Why this priority**: Reduces user friction and prevents duplicate pending records. Users may abandon due to distractions; allowing seamless continuation improves conversion rates.

**Independent Test**: Can be fully tested by starting Google sign-up, closing the browser during onboarding, returning later to sign up again, and verifying the previous onboarding state is restored.

**Acceptance Scenarios**:

1. **Given** a user who authenticated with Google but did not complete onboarding (PENDING status), **When** they authenticate with Google again, **Then** they are returned to the onboarding screen with any previously entered data preserved.
2. **Given** a PendingSignup record exists for a Google sub, **When** the same user authenticates with Google, **Then** the system loads their pending data instead of creating a new pending record.

---

### User Story 2d - Link Google to Existing Account (Priority: P2)

An existing user who registered via email/password wants to add Google as an authentication method to their account. They must first prove ownership of their account before linking.

**Why this priority**: Supports users who want the convenience of Google sign-in after having registered traditionally. Account linking must be secure to prevent account takeover.

**Independent Test**: Can be fully tested by logging in with password, navigating to account settings, clicking "Link Google Account", completing Google OAuth, and verifying subsequent Google sign-ins access the same account.

**Acceptance Scenarios**:

1. **Given** a logged-in user authenticated via password, **When** they initiate "Link Google Account" and complete Google OAuth, **Then** a new AuthIdentity is created linking their account to the Google sub.
2. **Given** a user not currently logged in, **When** they attempt to link Google to an existing account with matching email but no AuthIdentity, **Then** they must first verify account ownership via password or magic link before the link is created.
3. **Given** a Google account already linked to another user, **When** a user tries to link that same Google account, **Then** the system rejects the request with an appropriate error message.

---

### User Story 2e - Prevent Automatic Email-Based Account Merging (Priority: P3)

When a user authenticates with Google using an email that matches an existing account without a Google AuthIdentity, the system does NOT automatically merge the accounts. Instead, the user is informed and given options to either link (after verification) or create a separate new account.

**Why this priority**: Security feature to prevent unauthorized account access. While less common, this protects users whose email might be compromised or used by another party.

**Independent Test**: Can be fully tested by creating an account with email X, then attempting Google sign-up with the same email X, and verifying the system does not automatically grant access to the existing account.

**Acceptance Scenarios**:

1. **Given** an existing account with email X but no Google AuthIdentity, **When** a user authenticates with Google using email X, **Then** the system does NOT automatically log them into the existing account.
2. **Given** the above scenario, **When** the Google authentication completes, **Then** the user is presented with options: (a) verify ownership and link accounts, or (b) continue as new user with separate account.

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

**Discovery UI**
- What happens when problem card data is missing or fails to load?
  - System displays error message and retry button; cached data shown if available.
- What happens when search/filter returns no results?
  - System displays "No results found" message with suggestions to modify filters.

**Email/Password Authentication**
- What happens with duplicate registration attempt with same email?
  - System rejects with "Email already registered" error.
- What happens when password reset link has expired?
  - System displays "Link expired" message and prompts to request a new one.
- What happens when session expires?
  - System shows session expired notification and redirects to login.
- What happens when logging in from multiple devices simultaneously?
  - All sessions remain valid; each device has independent session.

**Google OAuth Authentication**
- What happens when Google's id_token signature verification fails?
  - System rejects authentication with a generic error, logs the security event.
- What happens when the id_token has expired (exp validation fails)?
  - System rejects with "Authentication expired, please try again."
- What happens when iss or aud do not match expected values?
  - System rejects with security error, prevents authentication.
- What happens when email_verified is false in the Google token?
  - System rejects authentication, requires verified Google email.
- What happens when nonce validation fails (if used)?
  - System rejects with security error to prevent replay attacks.
- What happens when a user tries to use a Google account already linked to another user?
  - System shows error: "This Google account is already linked to another user."
- What happens when username chosen during onboarding is already taken?
  - System shows validation error and prompts for a different username.
- What happens when the PendingSignup record has been pending too long?
  - PendingSignup records older than 30 days are automatically cleaned up; user starts fresh.

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

**User Authentication (Email/Password)**
- **FR-009**: System MUST support email/password-based registration
- **FR-010**: System MUST validate email format and password strength
- **FR-011**: System MUST provide password reset email functionality
- **FR-012**: System MUST maintain login state and manage sessions
- **FR-013**: System MUST provide logout functionality

**User Authentication (Google OAuth)**
- **FR-014**: System MUST treat "Sign up with Google" and "Sign in with Google" identically on the server side as "Continue with Google"
- **FR-015**: System MUST validate id_token signature using Google's public keys
- **FR-016**: System MUST validate id_token claims: iss (issuer), aud (audience), exp (expiration)
- **FR-017**: System MUST validate nonce claim when provided by the client
- **FR-018**: System MUST verify email_verified is true before accepting authentication
- **FR-019**: System MUST identify users by AuthIdentity mapping (provider, issuer, provider_user_id) NOT by email address
- **FR-020**: System MUST immediately issue session/token when AuthIdentity mapping exists for the Google sub
- **FR-021**: System MUST redirect to onboarding when no AuthIdentity mapping exists for the Google sub
- **FR-022**: System MUST pre-fill email from Google token during onboarding and disable modification
- **FR-023**: System MUST collect username/nickname during onboarding
- **FR-024**: System MUST NOT auto-merge accounts based on matching email when no AuthIdentity exists
- **FR-025**: System MUST require account ownership verification (password or magic link) before linking Google to existing account
- **FR-026**: System MUST persist PendingSignup or Users.status=PENDING for incomplete onboarding
- **FR-027**: System MUST restore pending onboarding state when user returns with same Google sub
- **FR-028**: System MUST prevent linking a Google account that is already linked to another user
- **FR-029**: System MUST log all authentication events including failures

**Access Control**
- **FR-030**: Unauthenticated users MUST be able to browse problem cards
- **FR-031**: Problem selection and Stage B progression MUST be available only to logged-in users
- **FR-032**: System MUST display login prompt when unauthenticated users access protected features
- **FR-033**: System MUST automatically return to intended action after login

### Key Entities

- **User**: The primary user account with status (PENDING/ACTIVE), profile information (user ID, email, username/nickname), authentication method, registration date, and last login
- **AuthIdentity**: Links external identity providers to User accounts; contains provider ("google"), issuer (iss from token), provider_user_id (sub from token), and reference to User
- **PendingSignup** (alternative: User with PENDING status): Stores incomplete registration data including Google token claims and any partially completed onboarding fields
- **ProblemCard**: Market problem card (problem ID, title, keyword list, domain, trend, sentiment, source URL, publication date)
- **Session**: User session (session ID, user ID, creation time, expiration time, device information)

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Discovery UI**
- **SC-001**: 70% or more of new visitors view at least 3 problem cards
- **SC-002**: Problem card list loads within 2 seconds
- **SC-003**: Search/filter results display within 1 second
- **SC-004**: 10% or more of users who view problem cards proceed to Stage B

**Authentication (General)**
- **SC-005**: 80% or more of users who start registration complete it
- **SC-006**: Registration completes in under 2 minutes on average
- **SC-007**: 95% or more of login attempts complete within 3 seconds

**Google OAuth Specific**
- **SC-008** (New user Google sign-up time, scoped & measurable): New users reach a usable first screen (authenticated session established and user record persisted) within P95 ≤ 60 seconds, measured from tapping "Continue with Google" to first screen render complete. Required onboarding must be minimal (single step, ≤ 1 input, or auto-generated). Optional onboarding must be deferred (just-in-time after first use).
- **SC-009** (Returning user Google sign-in time, realistic split): Returning users reach a usable first screen within:
  - P95 ≤ 5 seconds when a valid Google session is already present (no account chooser / re-consent), measured from tapping "Continue with Google" to first screen render complete.
  - P95 ≤ 12 seconds when Google account selection or re-authentication is required, measured with the same boundaries.
- **SC-010** (Onboarding completion, session-based): ≥ 95% of users who start required onboarding complete it within the same session, where a session is defined as no inactivity gap > 30 minutes (or your app's standard session timeout).
- **SC-011** (Onboarding resume rate, 30-day window): Users who abandon required onboarding and return within 30 days successfully resume from the last saved step and complete registration at a rate of ≥ 80% (measured on users eligible to resume, excluding those blocked by deleted accounts, banned accounts, or provider-side failures).
- **SC-012** (Merge safety: no email-only merges): 0 unauthorized account merges occur due to email matching alone. Any merge or linking must require strong proof of control (e.g., authenticated OAuth identity with stable provider subject, plus explicit user confirmation when ambiguity exists). Email may be used for suggesting a link, not for executing a merge automatically.
- **SC-013** (Audit logging): 100% of authentication attempts (success and failure) are logged with sufficient fields to be auditable, including timestamp, user/account identifiers (internal ID), provider, client/app version, result code, and failure reason category. Logs must support traceability from a user-facing incident to backend events.
- **SC-014** (Account linking completion rate, defined funnel): For users who initiate account linking, the linking completion rate reaches ≥ 90% within the same session (P95), measured from opening the linking flow to link persisted and verified. Linking failures must provide a recoverable path (retry, alternate method, support contact) without creating duplicate accounts.
- **SC-015** (Token validation enforcement): 100% of invalid tokens (expired, tampered, wrong audience/issuer, replayed where applicable) are detected and rejected at the boundary enforcing authentication (API gateway/backend auth middleware). All rejections must be classified and logged with a reason code.

**System**
- **SC-016**: System supports 1000 concurrent users

## Assumptions

**Discovery UI**
- Data collected from 001-data-pipeline already exists in RDB (DocumentSummary) and Vector DB
- Initial PoC displays problems from single domain (real estate) only
- Mobile device detection based on viewport width (breakpoint at 768px)
- Infinite scroll loads 20 cards per batch
- Pagination displays 12 cards per page

**Authentication (General)**
- Social login supports only Google; expandable to Apple/Kakao later
- Password policy: minimum 8 characters, alphanumeric combination required
- Session duration: 7 days (30 days if "remember me" selected)
- Email verification omitted in initial PoC (can be added later)

**Google OAuth**
- The service has a configured Google OAuth client with client_id and client_secret
- Users have verified Google accounts (email_verified=true)
- Session/token mechanism already exists in the system for issuing authenticated sessions
- Username uniqueness is enforced at the database level
- Magic link functionality exists or will be implemented separately if needed for account linking
- PendingSignup records are automatically cleaned up after 30 days

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
