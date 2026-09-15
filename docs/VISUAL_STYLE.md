# Visual style

## Direction

EpicStack should feel like a carefully made physical number game: clear stacked bricks,
strong number typography, tactile edges, and a calm board. A proposed direction is warm
mineral surfaces, charcoal ink, fired-clay accents, and muted moss for successful ordering.
The identity uses a centered, widening stack as its signature: order made visible. Clay
marks the player's choice; moss marks completion. Fine registration lines suggest a
printed game board, while beveled edges suggest physical pieces.

## Palette and geometry

Use warm paper `#f1eee5` for the board, ivory `#faf8f1` for raised surfaces, charcoal
`#292d25` for primary text, and dark warm grey `#64675d` for secondary text. Clay `#a7462c`
is the primary accent, with ivory labels. Moss `#456044` denotes completed play. Maintain
contrast with dark text on light surfaces and ivory text on clay/charcoal surfaces.

The design uses a 4px spacing unit, 8px brick corners, 12px panel corners, and a thin
`#d2d1c4` divider. Buttons and interactive bricks are at least 44px tall. Focus uses a 3px
charcoal outline with a 3px offset. System sans-serif supplies UI text and large tabular
numbers; Georgia supplies the editorial menu headline. No external fonts are fetched.
Keep towers side by side, with equal top-to-bottom direction at every breakpoint. Mobile
places turn controls above the towers. Stage 4 has no decorative motion or sound.

Tower brick width increases linearly with its value: 1 is 72px wide, 100 fills the available
brick column, and intermediate values interpolate between those widths. Bricks are centered
in the column and retain a 44px minimum height and unchanged number size for readable,
touch-friendly targets. This applies equally to the human and computer towers.

Avoid default Bootstrap/Tailwind palettes, generic purple gradients, generic blue buttons,
emoji as primary game icons, stock illustrations, and default component-library styling.
The game board and number hierarchy should define the experience.

## Tokens to define before UI implementation

```css
--surface-primary
--surface-secondary
--brick-normal
--brick-selected
--brick-valid
--brick-warning
--text-primary
--text-muted
--accent-primary
```

Document exact color values and contrast pairs when they are selected. Also establish spacing,
brick dimensions, corner geometry, focus outlines, type scale, and animation durations.
Do not scatter unexplained visual values through components.

## Original assets (Stage 5)

The original SVG stack mark has three centered tiers and a clay inset. It accompanies a
tightly spaced system-type wordmark and doubles as the favicon. A matching 24px icon
family uses 1.75px strokes with squared, softly joined corners. The victory seal combines
an ordered stack, a check, and restrained radial registration marks; it is static in Stage 5.
Background linework repeats on a 48px grid. Buttons use opposing 12px/4px corners and
a dark lower edge, echoing brick geometry without clipping keyboard focus outlines.
Menu display bricks widen with value too, with a larger proportional minimum for their
decorative labels. Gameplay widths retain the exact 72px-to-full-width mapping above.

- Logo: a distinctive EpicStack wordmark paired with a simple ascending-stack mark.
- Bricks: crisp numbers, visible layers/edges, and clear selected/valid/warning states.
- Buttons: a consistent shape related to the bricks, with legible labels.
- Background: restrained board texture or linework that never competes with numbers.
- Icons: a small original SVG family with consistent strokes and proportions.
- Victory: an original ordered-stack treatment; respect reduced-motion preferences.

Prefer lightweight custom SVG for branding and icons. Decide the style before generating
decorative assets. Bundle essential assets locally; offline play cannot rely on remote fonts.

## Interaction and responsive requirements

Design for desktop, tablet, and mobile from the first UI stage. Keep both towers, turn state,
drawn brick, and primary action understandable without making the player infer hidden rules.
Preserve the top-to-bottom tower order at every size. Number readability and comfortable
touch targets take precedence over decoration.

Support keyboard selection and confirmation, visible focus, accessible labels, sufficient
contrast, reduced motion, and state indicators beyond color alone. Animations only display
completed state changes. Stage 6 adds saved mute controls in Settings and beside the board.

## Stage 6 motion and sound

Bricks settle by 7px over 240ms; the victory seal enters over 600ms with a small scale and
rotation. Thinking uses a 900ms opacity pulse plus persistent text. Reduced-motion disables
all decorative animations and transitions. Numbers, widths, and touch targets stay unchanged.

Sound uses quiet sine tones synthesized locally: draw 330Hz, placement 196Hz, win
392/494/587Hz, loss 294/220Hz. Notes last 130ms, spaced 110ms, with an 8ms attack and
an exponential release from gain 0.06 to 0.001. No remote assets or audio library are needed.
