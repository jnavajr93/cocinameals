/**
 * Generates a branded recipe card image (PNG blob) using Canvas API.
 * Features the cocina logo, recipe details, and brand colors.
 */
export async function generateRecipeCard(
  mealName: string,
  recipeText: string
): Promise<Blob> {
  const WIDTH = 1080;
  const PADDING = 72;
  const BG = "#F0E8D5";
  const FG = "#2B2B2B";
  const PRIMARY = "#1F4A3A"; // forest green
  const GOLD = "#C8892A";
  const MUTED = "#8A8070";

  // Parse recipe into sections
  const lines = recipeText.split("\n").filter((l) => l.trim());

  // Pre-calculate height
  const lineHeight = 42;
  const sectionGap = 28;
  let contentHeight = 0;

  const sections: { type: "heading" | "line"; text: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("##") ||
      trimmed.startsWith("**") ||
      trimmed.toUpperCase() === trimmed && trimmed.length > 2 && /[A-Z]/.test(trimmed)
    ) {
      sections.push({ type: "heading", text: trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "") });
      contentHeight += lineHeight + sectionGap;
    } else {
      sections.push({ type: "line", text: trimmed.replace(/^[-•]\s*/, "• ") });
      contentHeight += lineHeight;
    }
  }

  // Logo area + title + content + footer
  const HEADER_H = 160;
  const TITLE_H = 100;
  const FOOTER_H = 120;
  const totalHeight = HEADER_H + TITLE_H + contentHeight + FOOTER_H + PADDING * 2;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = Math.max(totalHeight, 800);
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top accent bar
  ctx.fillStyle = PRIMARY;
  ctx.fillRect(0, 0, canvas.width, 8);

  // Logo: "cocina" wordmark
  let logoX = PADDING;
  const logoY = 72;

  // "c" italic primary
  ctx.font = "italic bold 52px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = PRIMARY;
  ctx.fillText("c", logoX, logoY);
  logoX += ctx.measureText("c").width - 4;

  // "o" italic gold
  ctx.fillStyle = GOLD;
  ctx.fillText("o", logoX, logoY);
  logoX += ctx.measureText("o").width - 2;

  // "cina" upright
  ctx.font = "bold 52px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = FG;
  ctx.fillText("cina", logoX, logoY);

  // Divider under logo
  const divY = HEADER_H - 16;
  ctx.strokeStyle = GOLD + "55";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, divY);
  ctx.lineTo(canvas.width - PADDING, divY);
  ctx.stroke();

  // Meal name
  ctx.font = "bold 48px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = FG;
  const titleY = HEADER_H + 52;

  // Word-wrap title
  const maxW = canvas.width - PADDING * 2;
  const titleWords = mealName.split(" ");
  let titleLine = "";
  let titleLineY = titleY;
  for (const word of titleWords) {
    const test = titleLine ? `${titleLine} ${word}` : word;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(titleLine, PADDING, titleLineY);
      titleLine = word;
      titleLineY += 56;
    } else {
      titleLine = test;
    }
  }
  if (titleLine) ctx.fillText(titleLine, PADDING, titleLineY);

  // Content
  let curY = titleLineY + 56;
  ctx.textBaseline = "top";

  for (const section of sections) {
    if (section.type === "heading") {
      curY += 12;
      ctx.font = "bold 32px 'Outfit', 'Helvetica Neue', sans-serif";
      ctx.fillStyle = PRIMARY;
      ctx.fillText(section.text, PADDING, curY);
      curY += lineHeight + 4;
    } else {
      ctx.font = "400 28px 'Outfit', 'Helvetica Neue', sans-serif";
      ctx.fillStyle = FG;

      // Word wrap
      const words = section.text.split(" ");
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(line, PADDING, curY);
          line = word;
          curY += lineHeight;
        } else {
          line = test;
        }
      }
      if (line) {
        ctx.fillText(line, PADDING, curY);
        curY += lineHeight;
      }
    }
  }

  // Footer
  curY += 32;
  ctx.strokeStyle = GOLD + "55";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, curY);
  ctx.lineTo(canvas.width - PADDING, curY);
  ctx.stroke();

  curY += 28;
  ctx.font = "400 24px 'Outfit', 'Helvetica Neue', sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText("Made with cocina · smart meal planning", PADDING, curY);
  curY += 34;
  ctx.fillStyle = GOLD;
  ctx.font = "500 24px 'Outfit', 'Helvetica Neue', sans-serif";
  ctx.fillText("cocinameals.lovable.app", PADDING, curY);

  // Resize canvas to actual content height
  const finalHeight = curY + PADDING;
  if (finalHeight !== canvas.height) {
    const imageData = ctx.getImageData(0, 0, canvas.width, Math.min(finalHeight, canvas.height));
    canvas.height = finalHeight;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png"
    );
  });
}
