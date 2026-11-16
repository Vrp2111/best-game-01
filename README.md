# PRISMWARD

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/vrp2111/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/vrp2111/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

A light tower defense — mirrors & prisms. Shadows crawl out of the dark to eat your Lantern, and your only weapon is light.

**The one mechanic:** an Emitter fires a white beam; a Mirror bends it 90°; a **Prism splits it into three coloured beams** — red straight (2× damage), blue left (slows shadows 50%), green right (kills heal the Lantern +1); a Lens doubles a beam's damage. Every shadow wears a glowing ring in the colour it is **weak** to (2× damage) and resists another (0.5×). Win by routing the right colour to the right shadow. Survive all 10 waves.

## Run

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network requests — plain Canvas 2D + vanilla JS, all sounds synthesized with WebAudio.

## Play

- Click a tower in the palette (or press 1–4), then click a tile to build. **R** or right-click rotates. Click a placed tower to rotate or sell it.
- **Space** starts the next wave. **P** pauses. **Esc** deselects. **1×/2×** toggles game speed.
- Earn lumens from kills; spend them on more optics. A shadow that reaches the Lantern bites off health — at 0 HP the light dies.

## License

MIT — see [LICENSE](LICENSE).

Bounty: https://make.fun/bounty/best-game-01 (referral code: `s75rqb78`)
