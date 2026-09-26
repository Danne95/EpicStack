export function HowToPlayScreen() {
  return (
    <main id="main" className="reading-screen">
      <h1 tabIndex={-1}>How to play</h1>
      <p className="lead">
        Be the first to arrange ten bricks from smallest at the top to largest at the bottom.
      </p>
      <ol className="how-steps">
        <li>
          <span className="step-number">01</span>
          <div>
            <h2>Get a number</h2>
            <p>
              Each turn automatically gives you a random number from 1–100 that isn’t already in
              either tower.
            </p>
          </div>
        </li>
        <li>
          <span className="step-number">02</span>
          <div>
            <h2>Choose its place</h2>
            <p>
              Select one brick in your tower, then confirm the replacement. You must place your
              drawn number, even when the choice is tricky.
            </p>
          </div>
        </li>
        <li>
          <span className="step-number">03</span>
          <div>
            <h2>Build your order</h2>
            <p>
              The computer takes its turn. Keep going until one tower is fully ascending. Gaps are
              fine: 4, 12, 25 is in order.
            </p>
          </div>
        </li>
      </ol>
      <div className="rule-note">
        <strong>A few things worth knowing</strong>
        <p>
          The first player is chosen randomly. Removed numbers can appear again later, so the supply
          never runs out. You can see both towers, but only change your own.
        </p>
        <p>
          Using a keyboard? Tab to a brick, press Enter or Space to select it, then Tab to confirm.
        </p>
      </div>
    </main>
  );
}
