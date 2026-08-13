/**
 * Launches the native Teams desktop client via its custom URI scheme
 * (`msteams://`) instead of the `https://teams.microsoft.com/...` web link -
 * the web link only opens Teams-in-browser, which is what this is meant to
 * avoid. Same intent as the TeamViewer deep link elsewhere in the app
 * (`teamviewer10://`): hand off to the OS-registered desktop app with no
 * browser fallback. There is no web API to detect when a native app opened
 * via a custom scheme is closed, so callers rely on the manual "End Call"
 * action instead of an onClose callback.
 */
export function openTeamsCallWindow(targetEmail: string): void {
  const teamsDeepLink = `msteams://l/call/0/0?users=${encodeURIComponent(targetEmail)}`;

  window.location.href = teamsDeepLink;
}
