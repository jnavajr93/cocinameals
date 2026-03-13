import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: recipe } = await supabase
    .from("shared_recipes")
    .select("meal_name, shared_by_name, tags")
    .eq("id", id)
    .single();

  const mealName = recipe?.meal_name || "A delicious recipe";
  const sharedBy = recipe?.shared_by_name ? ` by ${recipe.shared_by_name}` : "";
  const tags = Array.isArray(recipe?.tags) ? (recipe.tags as string[]).slice(0, 4).join(", ") : "";
  const description = `${mealName}${sharedBy} — made with Cocina.${tags ? ` ${tags}` : ""}`;
  const title = `${mealName} — Cocina`;
  const siteUrl = Deno.env.get("SITE_URL") || "https://cocinameals.lovable.app";
  const redirectUrl = `${siteUrl}/recipe/${id}`;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const ogImage = `${supabaseUrl}/functions/v1/og-image?id=${id}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${redirectUrl}" />
  <meta property="og:site_name" content="cocina" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="icon" href="${siteUrl}/favicon.png" type="image/png" />
  <link rel="apple-touch-icon" href="${ogImage}" />
  <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${redirectUrl}">${escapeHtml(mealName)}</a>…</p>
  <script>window.location.replace("${redirectUrl}");</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: new Headers({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600",
    }),
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
