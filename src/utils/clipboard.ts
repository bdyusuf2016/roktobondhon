/**
 * Universal Fail-Safe Clipboard Helper
 * Supports modern Clipboard API with robust textarea fallback for all browsers,
 * iframe contexts, HTTP, and HTTPS environments.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 1. Try modern navigator.clipboard API if available
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to legacy execCommand below
    }
  }

  // 2. Cross-Browser ExecCommand Fallback
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Keep off-screen and invisible without display:none so it remains selectable
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch (err) {
    console.error('execCommand copy fallback failed:', err);
  }

  return false;
};
