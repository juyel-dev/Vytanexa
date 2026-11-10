-- get_advisors (security) flagged get_donor_phone (migration 0012)
-- with function_search_path_mutable -- a SECURITY DEFINER function
-- without a pinned search_path is vulnerable to search_path hijacking
-- (a malicious schema earlier in the caller's search_path could shadow
-- an object the function references). is_admin() (migration 0005)
-- doesn't hit this warning because it has no object references that
-- could be shadowed in a meaningful way for its simple EXISTS query,
-- but the fix is cheap and correct regardless: pin it explicitly.

ALTER FUNCTION get_donor_phone(UUID) SET search_path = public;
