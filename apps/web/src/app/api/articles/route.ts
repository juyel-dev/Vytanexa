import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queryArticleList, type ArticleListParams } from '@/lib/queries/article-list';

/** GET /api/articles — infinite scroll continuation, mirrors /api/hospitals (S08). */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params: ArticleListParams = {
    category: sp.get('category') ?? undefined,
    page: sp.get('page') ? Number(sp.get('page')) : 0,
  };

  const supabase = createClient();
  const { data, error, count, pageSize } = await queryArticleList(supabase, params);

  if (error) {
    console.error('articles list query failed:', error.message);
    return NextResponse.json({ articles: [], count: 0, hasMore: false }, { status: 500 });
  }

  const hasMore = ((params.page ?? 0) + 1) * pageSize < count;
  return NextResponse.json({ articles: data, count, hasMore });
}
