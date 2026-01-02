# Payment System POC - Demo Guide

**Feature**: Payment Flow POC with Toss Payments
**Branch**: `002-payment-system`
**Date**: 2025-12-30

## Overview

This guide provides a step-by-step walkthrough for demonstrating the payment system POC to stakeholders. The demo showcases the complete payment flow from initiation to completion using Toss Payments test environment.

## Prerequisites

Before starting the demo:

1. **Environment Setup**:
   - Backend server running on `http://localhost:8000`
   - Frontend server running on `http://localhost:3000`
   - Toss Payments test credentials configured in `.env`

2. **Test User Account**:
   - Have a test user account ready (or use demo credentials)
   - Ensure user is logged in before starting payment flow

3. **Test Card**:
   - Card Number: `4000000000000008`
   - Expiry: Any future date (e.g., `12/25`)
   - CVV: Any 3 digits (e.g., `123`)

## Demo Script

### Part 1: Successful Payment Flow (5 minutes)

**Objective**: Demonstrate the complete happy path from payment initiation to success confirmation.

#### Step 1: Navigate to Checkout Page

1. Open browser to `http://localhost:3000/payment/checkout`
2. **Point out**:
   - Clean, professional checkout interface
   - Clear display of order details (Stage C Technical Specs)
   - Prominent payment amount (₩1,990)
   - Secure payment badge (Toss Payments logo)

#### Step 2: Initiate Payment

1. Click the "Pay ₩1,990" button
2. **Point out**:
   - Loading state with spinner (shows system is processing)
   - Backend creates payment session
   - Toss API is called to generate checkout URL

3. **Expected result**: Browser redirects to Toss Payments checkout page

#### Step 3: Complete Payment on Toss

1. On Toss checkout page, enter test card details:
   - Card: `4000000000000008`
   - Expiry: `12/25`
   - CVV: `123`

2. Click "결제하기" (Pay) button

3. **Point out**:
   - Toss handles all sensitive payment data (PCI compliance)
   - Our app never sees card details
   - Secure, industry-standard payment flow

#### Step 4: Success Confirmation

1. **Expected result**: Redirect back to `http://localhost:3000/payment/success`

2. **Point out**:
   - Clear success message with green checkmark
   - Complete transaction details displayed:
     - Order name
     - Payment amount
     - Order ID
     - Timestamps (created and approved)
   - "Continue to Dashboard" button
   - "View Full Payment Details" link

3. Click "View Full Payment Details"

4. **Point out**:
   - Dedicated status page with complete payment information
   - Users can return to this page anytime
   - Clean URL structure: `/payment/status/{orderId}`

---

### Part 2: Failed Payment Flow (3 minutes)

**Objective**: Demonstrate error handling and user feedback for failed payments.

#### Step 1: Initiate Another Payment

1. Navigate back to `http://localhost:3000/payment/checkout`
2. Click "Pay ₩1,990" button
3. Wait for redirect to Toss checkout page

#### Step 2: Cancel Payment

1. On Toss checkout page, click "취소" (Cancel) button or close the window

2. **Expected result**: Redirect to `http://localhost:3000/payment/failure`

3. **Point out**:
   - Clear error message with red X icon
   - User-friendly explanation of what happened
   - Error details displayed
   - "Try Again" button (returns to checkout)
   - "Return to Home" link
   - "View Payment Details" link (shows failed transaction)

---

### Part 3: Payment Status Lookup (2 minutes)

**Objective**: Demonstrate ability to check payment status at any time.

#### Step 1: Access Status Page

1. Copy an order ID from a previous transaction
2. Navigate to `http://localhost:3000/payment/status/{orderId}`

3. **Point out**:
   - Standalone status page accessible anytime
   - Full transaction history
   - Clear status indicator (SUCCESS/FAILED/etc.)
   - All relevant details in one place

#### Step 2: Authorization Check

1. Try to access the status page without being logged in
2. **Point out**: Authentication required (redirects to login)
3. **Security feature**: Users can only view their own payments

---

### Part 4: Technical Highlights (3 minutes)

**Objective**: Highlight technical implementation and architecture decisions.

#### Backend Architecture

1. Open `http://localhost:8000/docs` (FastAPI Swagger UI)

2. **Point out**:
   - Clean API design with 4 endpoints:
     - `POST /api/payment/initiate` - Create payment
     - `POST /api/payment/confirm` - Confirm after Toss redirect
     - `POST /api/payment/fail` - Record failure
     - `GET /api/payment/status/{order_id}` - Query status
   - All endpoints require authentication
   - Comprehensive request/response schemas

3. **Mention**:
   - Session-based storage (in-memory for POC, Redis-ready)
   - Automatic session cleanup every 5 minutes
   - 30-minute session timeout for security
   - Comprehensive logging for debugging

#### Frontend Architecture

1. **Point out**:
   - Reusable PaymentButton component
   - Reusable PaymentStatus component
   - Clean separation of concerns
   - Consistent UI/UX with rest of app

2. **Mention**:
   - TypeScript for type safety
   - Error handling at every step
   - Loading states for better UX
   - Responsive design (works on mobile)

---

### Part 5: Session Expiration (Optional, 2 minutes)

**Objective**: Demonstrate session timeout handling.

#### Step 1: Initiate Payment

1. Start a new payment on checkout page
2. Click "Pay ₩1,990" button
3. Reach Toss checkout page

#### Step 2: Wait for Expiration

1. **Note**: Default timeout is 30 minutes (can be reduced for demo)
2. Option A: Wait 30+ minutes
3. Option B: Manually adjust timeout in settings for quick demo

#### Step 3: Try to Complete

1. Attempt to complete payment after timeout
2. **Expected result**: Error message about expired session
3. **Point out**: Security feature preventing stale sessions

---

## Key Talking Points

### Business Value

1. **Quick Time-to-Market**: POC built rapidly using proven patterns
2. **Production-Ready Foundation**: Clean architecture, easy to extend
3. **Secure by Design**: No sensitive data in our systems (PCI compliant)
4. **User-Friendly**: Clear messaging at every step

### Technical Excellence

1. **Modern Tech Stack**:
   - Python 3.11+ with FastAPI (async/await)
   - Next.js 14 with App Router
   - TypeScript for type safety

2. **Best Practices**:
   - Clean code architecture
   - Comprehensive error handling
   - Detailed logging for debugging
   - Security-first approach

3. **Scalability**:
   - Session storage easily upgradeable to Redis
   - Stateless API design
   - Ready for horizontal scaling

### Next Steps (Production Roadiness)

1. **Essential**:
   - Switch to production Toss API keys
   - Implement webhook signature verification
   - Add database persistence for payment history
   - Set up monitoring and alerting

2. **Nice-to-Have**:
   - Payment history dashboard
   - Refund/cancellation workflow
   - Multi-currency support
   - Email notifications
   - Analytics and reporting

---

## Troubleshooting

### Payment Not Working

**Check**:
1. Backend logs: `uvicorn src.main:app --reload --log-level debug`
2. Frontend console: F12 → Console tab
3. Network tab: Check API requests/responses

**Common Issues**:
- Missing/invalid Toss API keys
- CORS issues (check allowed origins)
- User not authenticated

### Toss Redirect Issues

**Check**:
1. `PAYMENT_SUCCESS_URL` matches frontend URL
2. `PAYMENT_FAILURE_URL` matches frontend URL
3. No trailing slashes in URLs

### Session Not Found

**Possible Causes**:
- Session expired (30 min timeout)
- User switched accounts
- Backend restarted (in-memory storage cleared)

---

## Demo Checklist

Before the demo:

- [ ] Backend server running
- [ ] Frontend server running
- [ ] Test user logged in
- [ ] Test card details ready
- [ ] Browser cache cleared
- [ ] Dev tools closed (open only when showing technical details)
- [ ] Swagger UI bookmark ready
- [ ] Example order ID saved for status lookup

During the demo:

- [ ] Completed successful payment flow
- [ ] Completed failed payment flow
- [ ] Showed status lookup
- [ ] Highlighted key technical features
- [ ] Answered questions

After the demo:

- [ ] Collect feedback
- [ ] Note any issues encountered
- [ ] Plan next iteration based on feedback

---

## Q&A Preparation

**Q: How long did this take to build?**
A: Core functionality implemented in ~1 day following the design documents.

**Q: Is this production-ready?**
A: It's a POC demonstrating the complete flow. Production deployment requires database persistence, webhook implementation, and monitoring.

**Q: What about refunds?**
A: Not in scope for POC, but Toss Payments API supports refunds. Can be added in next iteration.

**Q: How secure is this?**
A: Very secure. Toss handles all card data (PCI compliant). We only store transaction IDs and status. Sessions expire automatically.

**Q: Can we handle multiple concurrent users?**
A: Yes, current design supports concurrent users. For high scale, upgrade to Redis for session storage.

**Q: What about payment failures?**
A: All error cases are handled with clear user messaging. Failed payments are logged for analysis.

---

## Success Metrics

After the demo, stakeholders should understand:

1. ✅ Complete payment flow (initiate → redirect → confirm)
2. ✅ Error handling and user feedback
3. ✅ Payment status tracking
4. ✅ Security measures in place
5. ✅ Technical architecture and scalability
6. ✅ Path to production deployment

---

*End of Demo Guide*
