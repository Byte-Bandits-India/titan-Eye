export function openTeamViewer(): void {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isMobile) {
    if (isAndroid) {
      window.location.href =
        'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.teamviewer.teamviewer.market.mobile;end';
      setTimeout(() => {
        if (!document.hidden) {
          window.open(
            'https://play.google.com/store/apps/details?id=com.teamviewer.teamviewer.market.mobile',
            '_blank'
          );
        }
      }, 2500);
    } else {
      window.location.href = 'teamviewer://';
      setTimeout(() => {
        if (!document.hidden) {
          window.open('https://apps.apple.com/app/teamviewer-remote-control/id692045981', '_blank');
        }
      }, 2500);
    }

    return;
  }

  window.location.href = 'teamviewer10://';
}
