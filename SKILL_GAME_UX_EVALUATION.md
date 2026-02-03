# Game UX evaluation checklist

A rubric for evaluating web-based multiplayer games, with emphasis on casual/party game patterns.

---

## 1. Feedback and responsiveness

### Immediate input feedback
- [ ] Button presses have instant visual response (< 100ms)
- [ ] Hover states are visible and consistent
- [ ] Disabled states are clearly distinguishable from active states
- [ ] Touch/click targets have ripple, scale, or color feedback (Material Design pattern)

### Action confirmation
- [ ] Submitted answers/actions show confirmation state
- [ ] Loading states are visible when waiting for server response
- [ ] Error states explain what went wrong and what to do next

### "Juice" effects for key moments
- [ ] Correct answers: particles, glow, bounce, or celebration animation
- [ ] Wrong answers: shake, red flash, or subtle negative feedback
- [ ] Points earned: number flies to score, scale animation, or counter tick-up
- [ ] Critical moments: brief screen shake or camera zoom (0.1-0.2s)

**Examples:**
- Jackbox: Submitted answers show checkmark, then dramatic reveal with audience reactions
- Kahoot: Correct answer triggers green flash + point counter animation
- Among Us: Emergency meeting has full-screen alert with dramatic sound

---

## 2. Timer and urgency visualization

### Timer display
- [ ] Timer is always visible when active
- [ ] Timer uses both number and visual indicator (progress bar, circular countdown)
- [ ] Final 5-10 seconds have distinct visual treatment (color change, pulse)
- [ ] Timer size/prominence scales with urgency

### Urgency escalation (without causing anxiety)
- [ ] Color shifts from calm (green/blue) to urgent (yellow/orange/red)
- [ ] Animation speed increases as time decreases
- [ ] Audio pitch or tempo increases subtly
- [ ] Pulse/heartbeat effect in final seconds

### Balanced tension
- [ ] Time pressure creates excitement, not panic
- [ ] Players have enough time to complete reasonable actions
- [ ] Late submissions are handled gracefully (don't punish network lag)

**Examples:**
- Kahoot: Timer bar shrinks left-to-right, music speeds up, colors shift to red
- Jackbox Quiplash: Timer pulses red in final 5 seconds
- Among Us: Voting timer shows clear countdown with visual bar

---

## 3. Round transitions and results

### Round start
- [ ] Clear "round X of Y" indicator
- [ ] Brief countdown before action begins (3-2-1-GO pattern)
- [ ] Players know what they need to do before timer starts

### Round end
- [ ] Clear signal that round is over (not just timer hitting zero)
- [ ] Brief pause before results (build anticipation)
- [ ] Results revealed progressively, not all at once

### Results reveal patterns
- [ ] Staggered reveal: show answers/options first, then votes/results
- [ ] Dramatic pause before winner announcement
- [ ] Losers acknowledged without humiliation (clapping, "good try")
- [ ] Winner celebration: confetti, sound effect, character animation

**Examples:**
- Jackbox Quiplash: Both answers shown, then votes animate in one-by-one, winner declared with fanfare
- Kahoot: Correct answer revealed, then leaderboard animates with position changes
- Super Smash Bros: Slash transition, winner pose with confetti, losers clap in background

---

## 4. Leaderboard and scoring

### Score changes
- [ ] Points animate (count up/down, not instant change)
- [ ] Score changes are attributed to specific actions ("+ 100 for speed bonus")
- [ ] Positive changes feel rewarding (green, upward motion)
- [ ] Negative changes are clear but not punishing

### Leaderboard updates
- [ ] Rank changes animate (players slide up/down)
- [ ] Current player's position is always highlighted
- [ ] "Nearby" context: show players 2-3 positions above/below current player
- [ ] New leader gets special callout

### Speed bonus patterns
- [ ] Bonus multiplier visible during action (not just explained in rules)
- [ ] Fast correct > slow correct > wrong (clear hierarchy)
- [ ] Bonus points shown separately from base points

**Examples:**
- Kahoot: Leaderboard shows top 5 with animated rank changes, your rank always visible
- Jackbox: Points fly from answer to player's score, with distinct sound per amount
- Mario Kart: Position indicator pulses when you pass someone

---

## 5. Multiplayer awareness

### Player presence
- [ ] All players visible in lobby with clear join confirmation
- [ ] Player avatars/names consistently displayed
- [ ] Disconnected players handled gracefully (visual indicator, timeout)
- [ ] Host/leader distinguished from other players

### Real-time status
- [ ] "X players have answered" indicator during question phase
- [ ] Typing/activity indicators when relevant
- [ ] Waiting-for-players state is clear ("Waiting for 2 more...")

### Shared moment design
- [ ] Key reveals happen simultaneously for all players
- [ ] Reactions can be shared (emoji, sounds, chat)
- [ ] Spectator experience is engaging (Jackbox "audience" mode)

**Examples:**
- Among Us: Player icons show alive/dead, voting status during meetings
- Jackbox: "X of Y players answered" updates in real-time
- Kahoot: Player count visible, late joiners handled smoothly

---

## 6. Onboarding and clarity

### First-time experience
- [ ] Rules explained in 30 seconds or less
- [ ] Learning by doing > reading instructions
- [ ] Practice round or example before real gameplay
- [ ] Controls are obvious (minimal buttons, clear labels)

### In-game guidance
- [ ] Current objective always clear ("Pick the funniest answer")
- [ ] What happens next is predictable
- [ ] Error recovery is obvious (back button, undo, try again)

### Accessibility
- [ ] Color is not the only indicator of state
- [ ] Text is readable at game distances
- [ ] Touch targets are large enough (44px minimum)
- [ ] Animation can be reduced for motion sensitivity

**Examples:**
- Jackbox: Host can explain while tutorial text appears, games playable without reading
- Among Us: Task list always visible, minimap shows location
- Kahoot: Four colored shapes + text, no color-blind issues

---

## 7. Audio design

### Feedback sounds
- [ ] Correct/success: bright, ascending, satisfying
- [ ] Wrong/failure: dull, descending, non-punishing
- [ ] Selection/click: subtle, non-repetitive
- [ ] Timer warning: escalating tension without annoyance

### Variation and polish
- [ ] Repeated sounds have slight variation (pitch, timing)
- [ ] Volume balanced (UI sounds quieter than game events)
- [ ] Music energy matches game phase (calm lobby, intense gameplay, triumphant victory)
- [ ] Sounds can be muted without losing critical information

### Emotional moments
- [ ] Victory sound is memorable and satisfying
- [ ] Defeat sound is clear but doesn't rub it in
- [ ] Suspense moments use silence or minimal music effectively

**Examples:**
- Kahoot: Music speeds up with timer, victory stinger on correct answer
- Among Us: Emergency meeting alarm is iconic and attention-grabbing
- Super Mario: Coin sound, power-up jingle, level complete fanfare

---

## 8. Visual polish and motion

### Animation principles
- [ ] Easing: nothing moves linearly (use ease-in-out, spring, bounce)
- [ ] Anticipation: slight wind-up before big movements
- [ ] Follow-through: elements settle after movement
- [ ] Timing: quick for UI (150-300ms), slower for emphasis (500ms+)

### State transitions
- [ ] Screen changes have smooth transitions (fade, slide, scale)
- [ ] Elements don't pop in/out abruptly
- [ ] Loading states use skeleton screens or progress indicators
- [ ] Errors appear with attention-grabbing but non-jarring animation

### Attention guidance
- [ ] Important elements draw the eye (size, motion, color)
- [ ] Secondary elements recede (lower contrast, smaller)
- [ ] Motion guides attention to next action
- [ ] Celebrate wins more than acknowledge losses

**Examples:**
- Jackbox: Smooth transitions between phases, dramatic reveals with scaling/rotation
- Among Us: Impostor reveal has dramatic zoom and red flash
- Material Design: Ripple shows touch point, elements emerge from touch location

---

## 9. Mobile/responsive considerations

### Touch-first design
- [ ] All interactions work without hover states
- [ ] Buttons are finger-sized (48px+ touch target)
- [ ] Swipe gestures are optional, not required
- [ ] No reliance on right-click or keyboard shortcuts

### Screen real estate
- [ ] Critical info visible without scrolling
- [ ] Timer and score always accessible
- [ ] Text remains readable on small screens
- [ ] Landscape and portrait both functional (or clear preference)

### Network resilience
- [ ] Brief disconnects don't kick players
- [ ] State syncs gracefully on reconnect
- [ ] Latency doesn't determine winners (or is compensated for)

---

## 10. Quick evaluation scorecard

Rate each category 1-5:

| Category | Score | Notes |
|----------|-------|-------|
| Input feedback | /5 | |
| Timer/urgency | /5 | |
| Round transitions | /5 | |
| Leaderboard/scoring | /5 | |
| Multiplayer awareness | /5 | |
| Onboarding/clarity | /5 | |
| Audio design | /5 | |
| Visual polish | /5 | |
| Mobile/responsive | /5 | |
| **Total** | /45 | |

**Scoring guide:**
- 1: Missing or broken
- 2: Functional but awkward
- 3: Acceptable, meets expectations
- 4: Good, some delightful moments
- 5: Excellent, industry-leading polish

---

## Reference games to study

| Game | Best at | Study for |
|------|---------|-----------|
| Jackbox (Quiplash, Fibbage) | Reveal drama, phone-as-controller UX, audience participation | Round transitions, voting UX, humor in feedback |
| Kahoot | Timer tension, leaderboard animation, speed bonus | Educational game feel, competitive casual UX |
| Among Us | Multiplayer state, cross-platform, social deduction | Lobby management, voting UI, role reveal drama |
| Super Smash Bros | Victory screens, character feedback, polish | Results reveal, winner celebration, animation quality |
| Wordle | Simplicity, shareable results, daily habit | Minimal UI, tile flip reveals, color-blind accessibility |
| Fall Guys | Round transitions, elimination handling, celebration | Mass multiplayer UX, losers experience, character customization |

---

## Resources

- [Game UI Database](https://www.gameuidatabase.com/) - 55,000+ UI screenshots filterable by category
- [Built In Chicago - Jackbox Design Principles](https://www.builtinchicago.org/articles/jackbox-games-design-party-pack) - Phone-as-controller philosophy
- [Game Feel Tutorial - GameDev Academy](https://gamedevacademy.org/game-feel-tutorial/) - Juice and polish techniques
- [NN/g Microinteractions](https://www.nngroup.com/articles/microinteractions/) - Trigger-feedback framework
- Vlambeer "Juice It or Lose It" GDC talk - Screen shake and impact
