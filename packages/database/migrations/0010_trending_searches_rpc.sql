-- Vytanexa Database Migration
-- VYTANEXA-BLUEPRINT.md S05 "Trending Searches" needs a GROUP BY
-- aggregation over analytics_events.metadata->>'query' that plain
-- PostgREST calls can't express -- a small SECURITY DEFINER function
-- is the correct tool here (read-only, safe to expose to anon: it
-- returns only aggregated, anonymized query text + counts, never
-- individual event rows or any PII). Applied live via Supabase MCP
-- connector.

CREATE OR REPLACE FUNCTION get_trending_searches(p_limit INT DEFAULT 8)
RETURNS TABLE(query TEXT, search_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT metadata->>'query' AS query, COUNT(*) AS search_count
  FROM analytics_events
  WHERE event_type = 'search'
    AND metadata->>'query' IS NOT NULL
    AND created_at > now() - interval '7 days'
  GROUP BY metadata->>'query'
  ORDER BY search_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_trending_searches(INT) TO anon, authenticated;
