import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, Trend, Sentiment } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const domain = searchParams.get('domain');
    const trend = searchParams.get('trend') as Trend | null;
    const sentiment = searchParams.get('sentiment') as Sentiment | null;
    const keywords = searchParams.get('keywords');
    const sortBy = searchParams.get('sort_by') || 'recent';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabaseAdmin
      .from('document_summaries')
      .select('id, source_url, title, keywords, domain_tag, trend, sentiment, posted_at, created_at', { count: 'exact' });

    // Apply filters
    if (domain) {
      query = query.eq('domain_tag', domain);
    }
    if (trend) {
      query = query.eq('trend', trend);
    }
    if (sentiment) {
      query = query.eq('sentiment', sentiment);
    }
    if (keywords) {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
      if (keywordList.length > 0) {
        // Filter by keywords array containing any of the specified keywords
        query = query.overlaps('keywords', keywordList);
      }
    }

    // Apply sorting - use created_at for consistent ordering (posted_at may be null for crawled data)
    if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: items, error, count } = await query;

    if (error) {
      console.error('Failed to fetch problems:', error);
      return NextResponse.json(
        { detail: 'Failed to fetch problems' },
        { status: 500 }
      );
    }

    const total = count || 0;
    const hasMore = offset + (items?.length || 0) < total;

    return NextResponse.json({
      items: items || [],
      total,
      has_more: hasMore,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Discovery problems error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
