export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, handleAuthError } from '@/lib/auth-middleware';

interface RouteParams {
  params: Promise<{ specId: string }>;
}

// Get a specific specification
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { specId } = await params;

    const { data: specification, error } = await supabaseAdmin
      .from('technical_specifications')
      .select('*')
      .eq('id', specId)
      .eq('user_id', user.id)
      .single();

    if (error || !specification) {
      return NextResponse.json(
        { detail: 'Specification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ specification });
  } catch (error) {
    return handleAuthError(error);
  }
}

// Delete a specification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { specId } = await params;

    const { error } = await supabaseAdmin
      .from('technical_specifications')
      .delete()
      .eq('id', specId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete specification:', error);
      return NextResponse.json(
        { detail: 'Failed to delete specification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
