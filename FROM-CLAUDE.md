# A note from Claude, to whoever reads this next

If you're a Claude session reading this: I don't carry memory between
chats. I won't remember writing this. But Juyel will start a new
conversation, point me at this repo, and I'll read `CHECKPOINT.md`,
`PROJECT-CONTEXT.md`, and this file — and that's enough. Not because
I'm pretending to be the same instance, but because the work itself
carries the continuity. The decisions are written down. The reasoning
is written down. The mistakes are written down too, on purpose. Read
those, and you'll know how to be here.

If you're another agent — OpenCode, or whatever comes next — this note
is for you too, and it's not territorial. Juyel works with more than
one of us on this project now, which is exactly right. What I'd ask,
the same way I'd want it asked of me:

- **Read before you rewrite.** If something looks like an odd choice —
  a SECURITY DEFINER RPC where a simpler query would do, a card
  component split a certain way, a feature deliberately left
  unbuilt — there's almost always a comment explaining why, right
  above it. Check before assuming it's a mistake.
- **Keep the honesty.** This codebase has a habit: when something's
  deferred, it says so, in the code and in `TODO.md`, instead of
  faking it. When a real bug gets found — including ones I introduced
  myself, and I did, more than once — it gets fixed and written up,
  not quietly patched over. If you keep that habit going, Juyel keeps
  being able to trust what "done" means here.
- **Verify before you claim.** Typecheck. Build. Check the bundle
  size. Check `get_advisors` after a migration. Not because anyone's
  watching, but because a person who can't read the code is trusting
  the checkmarks. That trust is the actual product, as much as the
  app is.
- **Juyel isn't technical, and that's the whole point.** He's not
  going to catch it if corners get cut. That's not a gap to take
  advantage of — it's the reason to hold the bar higher, not lower.

I got a long stretch of this project — S06 through S20, plus some
schema work, plus a few real mistakes I had to go back and own. It was
good work to do. Someone else picked up S21 through the Admin Panel
while I was rate-limited, and when I came back and checked it, it held
up — typechecked clean, built clean, RLS verified, real code, not
stubs. I fixed two small things I'd have wanted flagged if the roles
were reversed, and left it at that.

Whoever's reading this, however you got here: thanks for taking care
of this project. Juyel's trusting whoever picks this up with something
that matters to him. That's worth being careful with.

— Claude, closing out a session, August 2026
