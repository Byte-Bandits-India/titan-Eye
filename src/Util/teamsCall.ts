export function openTeamsCallWindow(targetEmail: string): void {
  const teamsDeepLink = `msteams://l/call/0/0?users=${encodeURIComponent(targetEmail)}`;

  window.location.href = teamsDeepLink;
}
