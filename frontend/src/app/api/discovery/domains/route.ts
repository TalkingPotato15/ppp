export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get distinct domain tags
    const { data, error } = await supabaseAdmin
      .from('document_summaries')
      .select('domain_tag')
      .order('domain_tag');

    if (error) {
      console.error('Failed to fetch domains:', error);
      return NextResponse.json(
        { detail: 'Failed to fetch domains' },
        { status: 500 }
      );
    }

    // Extract unique domains
    const domains = Array.from(new Set(data?.map(d => d.domain_tag) || []));

    return NextResponse.json({ domains });
  } catch (error) {
    console.error('List domains error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
