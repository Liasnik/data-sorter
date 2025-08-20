export async function copyTextToClipboard(text: string): Promise<void> {
  const sanitized = text ?? '';
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(sanitized);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = sanitized;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}


