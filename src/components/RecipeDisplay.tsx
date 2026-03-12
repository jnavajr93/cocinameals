import { Lightbulb, Clock } from "lucide-react";

interface RecipeDisplayProps {
  text: string;
  loading?: boolean;
}

interface ParsedRecipe {
  macroLine: string | null;
  servesLine: string | null;
  ingredients: string[];
  prepSteps: string[];
  cookingSteps: string[];
  tipText: string | null;
  otherLines: string[];
}

function parseRecipe(text: string): ParsedRecipe {
  const lines = text.split("\n");
  const result: ParsedRecipe = {
    macroLine: null,
    servesLine: null,
    ingredients: [],
    prepSteps: [],
    cookingSteps: [],
    tipText: null,
    otherLines: [],
  };

  let section: "none" | "ingredients" | "prep" | "cooking" | "tip" = "none";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const upper = trimmed.toUpperCase();

    // Detect section headers
    if (upper === "INGREDIENT LIST" || upper === "INGREDIENTS") {
      section = "ingredients";
      continue;
    }
    if (upper === "PREP FIRST" || upper === "PREP STEPS" || upper === "PREPARATION") {
      section = "prep";
      continue;
    }
    if (upper === "COOKING STEPS" || upper === "COOKING" || upper.startsWith("COOK")) {
      if (upper === "COOKING STEPS" || upper === "COOKING") {
        section = "cooking";
        continue;
      }
    }
    if (upper.startsWith("NEXT LEVEL TIP")) {
      section = "tip";
      const afterColon = trimmed.replace(/^NEXT LEVEL TIP[:\s]*/i, "").trim();
      if (afterColon) result.tipText = afterColon;
      continue;
    }
    if (upper.startsWith("ESTIMATED:") || upper.startsWith("ESTIMATED ")) {
      result.macroLine = trimmed.replace(/^ESTIMATED[:\s]*/i, "").trim();
      section = "none";
      continue;
    }
    if (upper.startsWith("SERVES:") || upper.startsWith("SERVES ")) {
      result.servesLine = trimmed.replace(/^SERVES[:\s]*/i, "").trim();
      section = "none";
      continue;
    }

    // Add to appropriate section
    switch (section) {
      case "ingredients":
        result.ingredients.push(trimmed.replace(/^[-•]\s*/, ""));
        break;
      case "prep":
        result.prepSteps.push(trimmed.replace(/^\d+[.)]\s*/, ""));
        break;
      case "cooking":
        result.cookingSteps.push(trimmed);
        break;
      case "tip":
        result.tipText = (result.tipText ? result.tipText + " " : "") + trimmed;
        break;
      default:
        result.otherLines.push(trimmed);
    }
  }

  return result;
}

function extractMacros(macroLine: string) {
  const cal = macroLine.match(/(\d+)\s*cal/i)?.[1];
  const protein = macroLine.match(/P[:\s]*(\d+)\s*g/i)?.[1];
  const carbs = macroLine.match(/C[:\s]*(\d+)\s*g/i)?.[1];
  const fat = macroLine.match(/F[:\s]*(\d+)\s*g/i)?.[1];
  return { cal, protein, carbs, fat };
}

function extractServes(servesLine: string) {
  const people = servesLine.match(/(\d+)\s*people/i)?.[1];
  const time = servesLine.match(/Cook time[:\s]*(\d+)\s*min/i)?.[1] || servesLine.match(/(\d+)\s*min/i)?.[1];
  return { people, time };
}

export function RecipeDisplay({ text, loading }: RecipeDisplayProps) {
  if (!text && loading) return null;

  const parsed = parseRecipe(text);
  const hasParsedContent = parsed.ingredients.length > 0 || parsed.prepSteps.length > 0 || parsed.cookingSteps.length > 0;

  // If we can't parse it (streaming or weird format), fall back to plain text
  if (!hasParsedContent) {
    return (
      <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-2">
        {text}
        {loading && <span className="animate-pulse text-gold">|</span>}
      </pre>
    );
  }

  const macros = parsed.macroLine ? extractMacros(parsed.macroLine) : null;
  const serves = parsed.servesLine ? extractServes(parsed.servesLine) : null;

  return (
    <div className="flex flex-col gap-6 mt-2">
      {/* Macros & Serves Card — top */}
      {(macros || serves) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {macros?.cal && (
              <div className="flex items-center gap-1.5">
                <Flame size={14} className="text-gold" />
                <span className="font-body text-sm font-semibold text-foreground">{macros.cal}</span>
                <span className="font-body text-xs text-muted-foreground">cal</span>
              </div>
            )}
            {serves?.people && (
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-primary" />
                <span className="font-body text-sm font-semibold text-foreground">{serves.people}</span>
                <span className="font-body text-xs text-muted-foreground">servings</span>
              </div>
            )}
            {serves?.time && (
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-muted-foreground" />
                <span className="font-body text-sm font-semibold text-foreground">{serves.time}</span>
                <span className="font-body text-xs text-muted-foreground">min</span>
              </div>
            )}
          </div>
          {macros && (macros.protein || macros.carbs || macros.fat) && (
            <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-border">
              {macros.protein && (
                <div className="font-body text-xs text-muted-foreground">
                  Protein <span className="font-semibold text-foreground">{macros.protein}g</span>
                </div>
              )}
              {macros.carbs && (
                <div className="font-body text-xs text-muted-foreground">
                  Carbs <span className="font-semibold text-foreground">{macros.carbs}g</span>
                </div>
              )}
              {macros.fat && (
                <div className="font-body text-xs text-muted-foreground">
                  Fat <span className="font-semibold text-foreground">{macros.fat}g</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ingredients */}
      {parsed.ingredients.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks size={16} className="text-gold" />
            <h3 className="font-display text-base font-bold text-foreground">Ingredients</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {parsed.ingredients.map((item, i) => (
              <span key={i} className="font-body text-sm text-foreground leading-relaxed">
                • {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prep */}
      {parsed.prepSteps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed size={16} className="text-gold" />
            <h3 className="font-display text-base font-bold text-foreground">Prep First</h3>
          </div>
          <div className="flex flex-col gap-3">
            {parsed.prepSteps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-display text-sm font-bold text-gold shrink-0 w-6 text-right">{i + 1}.</span>
                <p className="font-body text-sm text-foreground leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cooking Steps */}
      {parsed.cookingSteps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ChefHat size={16} className="text-gold" />
            <h3 className="font-display text-base font-bold text-foreground">Cooking Steps</h3>
          </div>
          <div className="flex flex-col gap-2">
            {parsed.cookingSteps.map((step, i) => {
              const isStepHeader = /^Step\s+\d/i.test(step);
              return isStepHeader ? (
                <p key={i} className="font-body text-sm font-bold text-foreground mt-2 first:mt-0">{step}</p>
              ) : (
                <p key={i} className="font-body text-sm text-foreground leading-relaxed pl-1">{step}</p>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Level Tip */}
      {parsed.tipText && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
          <div className="flex items-start gap-2.5">
            <Lightbulb size={18} className="text-gold shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-sm font-bold text-foreground mb-1">Next Level Tip</h3>
              <p className="font-body text-sm text-foreground/80 leading-relaxed">{parsed.tipText}</p>
            </div>
          </div>
        </div>
      )}

      {/* Other lines that didn't fit a section */}
      {parsed.otherLines.length > 0 && (
        <div className="flex flex-col gap-1">
          {parsed.otherLines.map((line, i) => (
            <p key={i} className="font-body text-sm text-foreground leading-relaxed">{line}</p>
          ))}
        </div>
      )}

      {loading && <span className="animate-pulse text-gold font-body text-lg">|</span>}
    </div>
  );
}
