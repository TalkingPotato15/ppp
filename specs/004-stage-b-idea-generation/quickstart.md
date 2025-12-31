# Quickstart: Stage B - Idea Generation

**Feature**: 004-stage-b-idea-generation
**Date**: 2025-12-31

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ installed
- Git repository cloned
- Virtual environment set up

## Setup

### 1. Backend Setup

```bash
# Navigate to project root
cd /path/to/ppp

# Activate virtual environment
source .venv/bin/activate

# Install dependencies (if not already)
pip install -e ".[dev]"

# Run database migrations
alembic upgrade head

# Start the backend server
python -m src.main serve --reload
```

Backend will be available at `http://localhost:8000`

### 2. Frontend Setup

```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Testing the Feature

### User Flow

1. **Login** at `http://localhost:3000/auth/login`
   - Use existing test account or register new one

2. **Browse Problems** on the main page
   - Click on a problem card to open preview

3. **Pay for Stage B** (payment flow)
   - Click "Pay to Unlock Stage B Ideas"
   - Complete Toss payment (test mode)

4. **Generate Ideas**
   - After payment success, you're redirected to Stage B
   - Click "Generate Ideas" button
   - Wait for AI agent to process (2-5 seconds in mock mode)

5. **View Ideas**
   - Browse generated idea cards
   - Click to expand and see details

6. **Bookmark Ideas**
   - Click bookmark icon on any idea
   - View bookmarked ideas in "My Ideas" page

### API Testing

```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.access_token')

# Generate ideas for a problem
curl -X POST http://localhost:8000/api/ideas/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"problem_id":"<problem-uuid>"}'

# Get latest session for a problem
curl http://localhost:8000/api/ideas/problem/<problem-uuid>/latest \
  -H "Authorization: Bearer $TOKEN"

# Toggle bookmark on an idea
curl -X PATCH http://localhost:8000/api/ideas/<idea-uuid>/bookmark \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_bookmarked":true}'

# List bookmarked ideas
curl http://localhost:8000/api/ideas/bookmarked \
  -H "Authorization: Bearer $TOKEN"
```

## Configuration

### Environment Variables

```bash
# .env file
# AI Agent API (leave empty for mock mode)
AI_AGENT_API_URL=
AI_AGENT_API_KEY=

# Existing settings
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
```

### Mock Mode

The AI agent runs in mock mode by default when `AI_AGENT_API_URL` is not set.
Mock mode:
- Returns templated ideas based on problem domain
- Simulates 2-5 second processing delay
- Generates 3-5 ideas per request

### Production Mode

To use the real AI agent API:
1. Set `AI_AGENT_API_URL` to the agent endpoint
2. Set `AI_AGENT_API_KEY` for authentication
3. Restart the backend server

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `src/api/routers/ideas.py` | API endpoints |
| `src/services/ai_agent.py` | AI agent integration |
| `src/storage/idea_store.py` | Database operations |
| `src/models/generation_session.py` | Session model |
| `src/models/generated_idea.py` | Idea model |
| `src/schemas/ideas.py` | Request/response schemas |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/app/stage-b/[problemId]/page.tsx` | Stage B page |
| `frontend/src/components/stage-b/IdeaCard.tsx` | Idea card component |
| `frontend/src/components/stage-b/GenerateButton.tsx` | Generate button |
| `frontend/src/hooks/useIdeas.ts` | Ideas data hooks |
| `frontend/src/app/my-ideas/page.tsx` | Saved/bookmarked ideas |

## Troubleshooting

### Ideas not generating

1. Check backend logs for errors
2. Verify user is authenticated
3. Ensure payment was completed for the problem

### One-time generation not enforced

Check if `get_latest_session_for_problem` returns existing session before generating.

### Bookmarks not persisting

1. Verify `is_bookmarked` column exists in database
2. Run latest migrations: `alembic upgrade head`

## Next Steps

After completing this quickstart:
1. Run `/speckit.tasks` to generate implementation tasks
2. Follow the tasks in order of priority
3. Test each feature independently
