# Web release

## Publish

Create the EpicStack GitHub repository and push this project to main. In Settings → Pages,
choose **GitHub Actions** as the source, then run **Publish EpicStack** from Actions.
The workflow installs the lockfile, checks once, builds, uploads dist, and deploys through
the github-pages environment. The completed deployment supplies the public site URL.

Public repositories support Pages on GitHub Free; private repositories require a supported
paid plan. See [GitHub’s custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The public repository is https://github.com/Danne95/EpicStack. Source upload, Pages enablement,
and live verification are the remaining release steps. Public source publishing was explicitly authorized on 2026-09-15.

## Preview and offline behavior

Run npm run build, then npm run preview. Development mode does not register a service worker.
Use the trailing-slash site URL and hash routes, such as /EpicStack/#/settings.

Wait for **Available offline** before disconnecting on the first visit. Every release asset
must cache successfully. Once ready, reopening, screens, AI, and new matches work offline.
Active matches still reset on refresh. Preferences and completed statistics remain saved
in that browser and origin; localhost data does not transfer to the hosted site.

**Update ready** means closing all EpicStack tabs allows the new version to activate.
No update forces a reload during play. Old caches are removed only within the same project
scope, leaving statistics and other sites untouched. A failed install preserves the old
active release. Roll back by reverting the source commit and redeploying.

Clearing site data or browser cache eviction removes offline availability; load online again
to restore it. Service workers require HTTPS or localhost. Offline support cannot make the
first visit work without a connection.

## Local verification — 2026-09-15

One full quality-check run and production build passed; all 134 existing tests passed.
No game-rule tests were added for release configuration. A production preview at /EpicStack/
verified offline reload, a full offline game, cached assets, and settings after reopening.
Desktop, tablet (820px), and phone (390px) checks reported no horizontal overflow or browser
errors. A simulated update waited for the open client, activated when it left, and removed
the previous version’s cache. Repeat a brief live check after the first GitHub deployment.
