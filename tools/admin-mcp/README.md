# vytanexa-admin-mcp

An [MCP](https://modelcontextprotocol.io) server that lets an AI agent (OpenCode, Claude, Hermes, any MCP client) work the admin **moderation queues** — reviews, community questions, data-correction reports — through the guarded `/api/agent/*` routes of `apps/admin`.

The agent sits **outside** the app. The app stays deterministic; AI cost and risk live in the agent, and every action it takes is audited with `actor_type = 'agent'`.

## What the agent can and cannot do

| Tool | Scope | Effect |
|---|---|---|
| `get_pending_counts` | read | backlog sizes |
| `list_pending` | read | pending items, oldest first, no phone numbers / user ids |
| `preview_decision` | moderate | **dry run** of approve/reject (reviews, questions) or resolve/dismiss (reports) |
| `apply_decision` | moderate | applies it; requires `user_confirmed: true` |

There is intentionally **no tool** to verify/suspend doctors, delete or ban anything, or change users, roles, settings, subscriptions. Those stay human-only in the admin UI.

Server-side guard rails (enforced in `apps/admin/src/app/api/agent/*`, not in prompts):

- only items still `pending` / `open` can change; already-moderated items are skipped
- `dry_run` defaults to `true`
- max 50 ids per call + atomic per-token **daily action cap**
- a `reason` is required for every action except approve
- tokens are scoped (`read` / `moderate`), expire, can be revoked, and only their sha256 is stored
- `AGENT_API_ENABLED=true` must be set on the admin deployment (kill switch: unset it → all agent routes answer 503)
- every write → `audit_logs` row with `actor_type='agent'`, the token id, the before-state and the reason

## One-time setup

### 1. Apply the migration

`supabase/migrations/20261121100000_agent_access.sql` (adds `agent_tokens`, `agent_usage`, the audit columns and `agent_consume_quota()`). Follow `supabase/README.md` — review it before applying to the hosted project.

### 2. Enable the agent API on the admin deployment

Set `AGENT_API_ENABLED=true` in the admin app's environment and redeploy.

### 3. Create a token (the raw token never goes in SQL or git)

```bash
TOKEN="vtx_agent_$(openssl rand -hex 32)"
echo "$TOKEN"                                   # save it in your password manager / agent config
printf '%s' "$TOKEN" | shasum -a 256 | cut -d' ' -f1   # this hash is what you store
```

In the Supabase SQL editor (replace the hash and your admin user id):

```sql
insert into public.agent_tokens
  (name, token_hash, scopes, daily_action_cap, created_by, expires_at)
values
  ('opencode-laptop', '<sha256 hex from above>', array['read','moderate'], 200,
   '<your admin_users.id>', now() + interval '90 days');
```

Revoke any time: `update public.agent_tokens set is_active = false, revoked_at = now() where name = 'opencode-laptop';`

For a scheduled/unattended agent, create a second token with `array['read']` only.

### 4. Build the server

```bash
cd tools/admin-mcp
npm install
npm run build
```

## Connect an agent

All clients run the same stdio command: `node /absolute/path/to/tools/admin-mcp/dist/index.js` with these environment variables:

```
VYTANEXA_ADMIN_URL=https://<your-admin-domain>
VYTANEXA_AGENT_TOKEN=vtx_agent_...
VYTANEXA_READ_ONLY=false        # "true" → only the two read tools are registered
```

**Claude Code**

```bash
claude mcp add vytanexa-admin \
  --env VYTANEXA_ADMIN_URL=https://<your-admin-domain> \
  --env VYTANEXA_AGENT_TOKEN=vtx_agent_... \
  -- node /absolute/path/to/tools/admin-mcp/dist/index.js
```

**OpenCode** (`opencode.json`)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "vytanexa-admin": {
      "type": "local",
      "command": ["node", "/absolute/path/to/tools/admin-mcp/dist/index.js"],
      "environment": {
        "VYTANEXA_ADMIN_URL": "https://<your-admin-domain>",
        "VYTANEXA_AGENT_TOKEN": "vtx_agent_..."
      },
      "enabled": true
    }
  }
}
```

**Hermes / any other MCP client**: register a local stdio server with the command and environment above (use that client's own MCP config format).

Keep the token out of git: put the config file in a gitignored location or inject the token from your shell environment.

## Suggested rollout

1. **Interactive**: you chat with the agent ("show pending reviews, reject obvious spam"). It must `preview_decision` and wait for your explicit yes before `apply_decision`.
2. After 2–3 weeks, check `audit_logs where actor_type = 'agent'` against your own decisions. Only a category where the agent matches you ~95%+ is worth automating.
3. Unattended runs: use a separate **read-only** token first (daily digest), and only consider a `moderate` token for the categories that earned it.

## Prompt-injection note

Review/question/report text is written by the public. The server prefixes every `list_pending` response with an untrusted-content notice, and the destructive/high-risk actions simply do not exist as tools, so a malicious review can at worst cause a wrong approve/reject of a *pending* item — which is audited and revertible from the before-state in `audit_logs`.
