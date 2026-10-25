/**
 * Decode a user-uploaded UTF-8 .txt resume.
 * Reject binary/invalid encodings rather than analyzing corrupted content.
 * Keeps original newlines so section and bullet analysis can use them.
 */
export function decodePlainTextResume(buffer: ArrayBuffer): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true })
      .decode(buffer)
      .replace(/^\uFEFF/, '')
      .trim();

    // Allow tabs and normal line breaks, but not binary/control characters.
    if (!text || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
      return null;
    }
    return text;
  } catch {
    return null;
  }
}
