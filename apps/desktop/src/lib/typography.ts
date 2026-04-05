const ASCII_RIGHT_ARROW_RE = /->/g;

export function normalizeArrowLigatures(text: string,) {
  return text.replace(ASCII_RIGHT_ARROW_RE, "→",);
}
