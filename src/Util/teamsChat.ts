import type { ManagedUser } from '../types';

export function getAdminAndSeniorOptomEmails(users: ManagedUser[]): string[] {
  const targetUsers = users.filter(
    (u) => (u.role === 'super_admin' || u.role === 'senior_optometrist') && u.status !== 'inactive'
  );

  const emails = targetUsers
    .map((u) => (u.microsoftUpn || u.email || '').trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    return ['admin@thebytebandits.onmicrosoft.com', 'optom-a@thebytebandits.onmicrosoft.com'];
  }

  return Array.from(new Set(emails));
}

export function launchTeamsDesktopDirectMessage(targetEmails: string[], message?: string): void {
  const validEmails = targetEmails
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  if (validEmails.length === 0) {
    return;
  }

  // Each email must be encoded individually, joined by a literal comma (not %2C) so Teams recognizes multiple recipients
  const usersParam = Array.from(new Set(validEmails))
    .map((e) => encodeURIComponent(e))
    .join(',');

  const encodedMessage = message ? `&message=${encodeURIComponent(message)}` : '';
  const teamsAppUrl = `msteams://l/chat/0/0?users=${usersParam}${encodedMessage}`;

  try {
    const link = document.createElement('a');
    link.href = teamsAppUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);
  } catch {
    window.location.assign(teamsAppUrl);
  }
}

export function openTeamsChatWindow(targetEmails: string[], message?: string): void {
  launchTeamsDesktopDirectMessage(targetEmails, message);
}
