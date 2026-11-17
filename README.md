# PRISMWARD

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/vrp2111/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/vrp2111/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A light tower defense — mirrors & prisms. Shadows crawl out of the dark to eat your Lantern, and your only weapon is light.

**The one mechanic:** an Emitter fires a white beam; a Mirror bends it 90°; a **Prism splits it into three coloured beams** — red straight (2× damage), blue left (slows shadows 50%), green right (kills heal the Lantern +1); a Lens doubles a beam's damage. Every shadow wears a glowing ring in the colour it is **weak** to (2× damage) and resists another (0.5×). Win by routing the right colour to the right shadow. Survive all 10 waves.

## What's new in v1.2 (the rework)

- **Tower upgrades — level up every tower.** Click any placed tower and buy **Lv 2, then Lv 3**: emitters hit +50%/+100% harder with wider beams, mirrors focus beams +25%/+50%, prisms split +25%/+50% harder, lenses focus ×2.5/×3. Upgraded towers show gold level pips on the board and a gold ring at max level. Selling refunds the whole investment (build + upgrades) at the run's sell rate.
- **The Dread Colossus fights back in three phases.** Wave 10's boss now changes as it is hurt: **Phase I** walks in, **Phase II (ENRAGED)** at ⅔ HP runs 35% faster with a burning orange ring, **Phase III (DESPERATE)** at ⅓ HP runs 60% faster and sheds living motes every 5 seconds. Each phase fires a banner across the board, and the boss bar above the field names the phase and shows its health.
- **Difficulty — Easy / Normal / Hard.** Pick on the title screen before a run: Easy softens shadows (×0.8 HP, ×0.9 speed) with 170 lumens and 25 Lantern HP; Normal is the game as designed; Hard toughens shadows (×1.25 HP, ×1.1 speed) with 120 lumens and 15 Lantern HP. The results screen records the difficulty of every run.

## What's new in v1.1 (the rework)

- **Prism Rites — a draft between waves.** After every cleared wave (1–9) the game pauses and offers three permanent blessings; pick one (click or keys **1–3**). The pool holds 12 rites — beam damage, a fourth prism beam, lens ×3, cheaper towers, richer kills, frostbite slow, extra Lantern HP, a once-per-run second chance, and more. Your picks stay listed in the sidebar and on the results screen, so every run grows a different build.
- **Shadows spread at spawn.** Each enemy now enters with a stagger and a lateral wobble, so waves no longer march out in a single-file line.
- **A real results screen.** The end of a run shows a letter grade (S–E), ten stats (waves, kills, damage, lumens earned/spent, towers built/sold, rites, time, HP left), the rites you drafted, a next goal, and your best score — saved in localStorage and shown on the title screen too.

## Run

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network requests — plain Canvas 2D + vanilla JS, all sounds synthesized with WebAudio.

## Play

- Click a tower in the palette (or press 1–4), then click a tile to build. **R** or right-click rotates. Click a placed tower to rotate, **upgrade it (Lv 2 / Lv 3)** or sell it.
- **Space** starts the next wave. **P** pauses. **Esc** deselects. **1×/2×** toggles game speed.
- After a wave clears, pick one of the three **Prism Rites** offered (click, or press **1–3**). The blessing lasts the whole run.
- Earn lumens from kills; spend them on more optics. A shadow that reaches the Lantern bites off health — at 0 HP the light dies.

## License

MIT — see [LICENSE](LICENSE).

Bounty: https://make.fun/bounty/best-game-01 (referral code: `s75rqb78`)
