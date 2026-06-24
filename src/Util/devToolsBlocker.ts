export function disableDevToolsShortcuts(): void {
  if (typeof window === 'undefined') return;

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;
    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }
    if (isCtrlOrMeta && (isShift || isAlt) && key === 'i') {
      e.preventDefault();
      return;
    }
    if (isCtrlOrMeta && (isShift || isAlt) && key === 'j') {
      e.preventDefault();
      return;
    }
    if (isCtrlOrMeta && (isShift || isAlt) && key === 'c') {
      e.preventDefault();
      return;
    }
    if (isCtrlOrMeta && (key === 'u' || (isAlt && key === 'u'))) {
      e.preventDefault();
      return;
    }
    if (isCtrlOrMeta && key === 's') {
      e.preventDefault();
      return;
    }
  });
}
