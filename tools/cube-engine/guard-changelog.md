# Cube engine block-guard changelog

APPEND-ONLY, and committed. Every re-recording of `tools/cube-engine/block-guard.json`
writes an entry here: the reason a human typed, the old and new sha of every block whose
content moved, and the diff.

It exists because of KILL 2 of the extract refutation. An in-block Studio edit used to be
a NOTICE, and the three commands the tools themselves print turned that NOTICE into
silence - after which nothing anywhere said what had changed inside the gate-verified
code that ships to the iPad. `--record-guard` now refuses without `--ack "<why>"` and
lands here, so what a reviewer reads is a sentence and a patch rather than a hash that
moved.

Never edit an entry. Never delete one. If an ack was wrong, add a new entry saying so.

---

## 2026-09-07  block-guard re-recorded

**Ack.** Fix pass 2026-09-07: re-recorded through the new signed --ack path so block-guard.json carries the ack fields. No block content changed; the four block shas are unchanged.

**Source.** `cube/index.html` sha256 `d65f279a3b3c07537eff77389619905326705ec2e39ad01a1d4e955a73c80878`

No block content changed; the boundary neighbourhood was re-recorded.

