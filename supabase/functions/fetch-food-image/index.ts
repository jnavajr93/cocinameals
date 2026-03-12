import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query) throw new Error("Missing query");

    const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
    if (!PEXELS_API_KEY) throw new Error("PEXELS_API_KEY is not configured");

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " food dish")}&per_page=1&orientation=landscape`;
    const resp = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Pexels error:", resp.status, t);
      return new Response(JSON.stringify({ imageUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const photo = data.photos?.[0];
    const imageUrl = photo?.src?.medium || null;

    return new Response(JSON.stringify({ imageUrl, photographer: photo?.photographer || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-food-image error:", e);
    return new Response(JSON.stringify({ imageUrl: null }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
