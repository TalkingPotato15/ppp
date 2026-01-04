export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';
import { validateConstraints } from '@/lib/constraint-validator';
import type { UserConstraints } from '@/types/stage-c';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { constraints } = body as { constraints: UserConstraints };

    if (!constraints) {
      return NextResponse.json(
        { valid: false, errors: [{ field: 'constraints', message: 'Constraints are required' }] },
        { status: 400 }
      );
    }

    const result = validateConstraints(constraints);
    return NextResponse.json(result);
  } catch (error) {
    return handleAuthError(error);
  }
}
