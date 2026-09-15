// Contrast is chosen from the actual accent, including the user's saved palette.
export function readableAccentColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#101812';
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const dark = [16, 24, 18].map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const darkLuminance = dark[0] * 0.2126 + dark[1] * 0.7152 + dark[2] * 0.0722;
  const darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
  const whiteContrast = 1.05 / (luminance + 0.05);
  if (darkContrast >= 4.5) return '#101812';
  if (whiteContrast >= 4.5) return '#ffffff';
  return '#000000';
}
