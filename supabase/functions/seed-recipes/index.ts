import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── CUISINE FLAVOR PROFILES ───────────────────────────────────
interface CuisineProfile {
  oil: string;
  aromatics: string;
  spices: string[];
  sauces: string[];
  garnish: string;
  starchBase: string;
}

const CUISINE_PROFILES: Record<string, CuisineProfile> = {
  mexican: {
    oil: "1 tbsp vegetable oil",
    aromatics: "1 small onion (diced), 2 cloves garlic (minced), 1 jalapeño (seeded, minced)",
    spices: ["1 tsp cumin", "1 tsp chili powder", "½ tsp smoked paprika", "¼ tsp oregano"],
    sauces: ["juice of 1 lime", "¼ cup salsa verde"],
    garnish: "fresh cilantro, diced avocado, lime wedge",
    starchBase: "warm corn tortillas",
  },
  italian: {
    oil: "2 tbsp extra virgin olive oil",
    aromatics: "3 cloves garlic (thinly sliced), ½ onion (diced fine)",
    spices: ["1 tsp dried basil", "½ tsp dried oregano", "¼ tsp red pepper flakes"],
    sauces: ["½ cup marinara sauce", "2 tbsp tomato paste"],
    garnish: "fresh basil leaves, grated Parmesan",
    starchBase: "8 oz pasta (cooked al dente)",
  },
  asian: {
    oil: "1 tbsp sesame oil + 1 tbsp vegetable oil",
    aromatics: "3 cloves garlic (minced), 1 inch ginger (grated), 3 scallions (sliced, whites and greens separated)",
    spices: ["½ tsp white pepper", "1 tsp five-spice powder"],
    sauces: ["2 tbsp soy sauce", "1 tbsp rice vinegar", "1 tsp sesame oil (finishing)"],
    garnish: "sliced scallion greens, toasted sesame seeds",
    starchBase: "2 cups cooked jasmine rice",
  },
  south_asian: {
    oil: "2 tbsp ghee (or vegetable oil)",
    aromatics: "1 onion (finely diced), 3 cloves garlic (minced), 1 inch ginger (grated), 1 green chili (slit)",
    spices: ["1 tsp turmeric", "1 tsp garam masala", "1 tsp cumin seeds", "½ tsp coriander powder"],
    sauces: ["½ cup plain yogurt", "¼ cup coconut milk"],
    garnish: "fresh cilantro, squeeze of lemon",
    starchBase: "2 cups cooked basmati rice or 2 naan breads",
  },
  mediterranean: {
    oil: "2 tbsp extra virgin olive oil",
    aromatics: "1 small red onion (diced), 2 cloves garlic (minced)",
    spices: ["1 tsp dried oregano", "½ tsp sumac", "¼ tsp cumin"],
    sauces: ["2 tbsp lemon juice", "¼ cup tahini"],
    garnish: "crumbled feta, Kalamata olives, fresh dill",
    starchBase: "warm pita bread or cooked couscous",
  },
  french: {
    oil: "2 tbsp unsalted butter",
    aromatics: "1 shallot (minced), 2 cloves garlic (minced)",
    spices: ["1 tsp herbes de Provence", "1 bay leaf", "fresh thyme sprig"],
    sauces: ["¼ cup dry white wine", "2 tbsp Dijon mustard"],
    garnish: "fresh chives, flaky sea salt",
    starchBase: "crusty baguette slices",
  },
  american: {
    oil: "1 tbsp butter + 1 tbsp olive oil",
    aromatics: "½ onion (diced), 2 cloves garlic (minced)",
    spices: ["½ tsp garlic powder", "½ tsp onion powder", "¼ tsp black pepper", "salt to taste"],
    sauces: ["1 tbsp Worcestershire sauce"],
    garnish: "chopped parsley",
    starchBase: "2 slices sourdough bread or baked potato",
  },
  latin_american: {
    oil: "2 tbsp vegetable oil",
    aromatics: "1 onion (diced), 3 cloves garlic (minced), 1 sweet pepper (diced)",
    spices: ["1 tsp cumin", "1 tsp achiote powder", "½ tsp oregano"],
    sauces: ["juice of 2 limes", "¼ cup sofrito"],
    garnish: "fresh cilantro, pickled onions, lime wedges",
    starchBase: "2 cups cooked white rice or arepas",
  },
  caribbean: {
    oil: "2 tbsp coconut oil",
    aromatics: "3 cloves garlic (minced), 1 scotch bonnet (seeded, minced — use ¼ for mild), 3 scallions (sliced), 1 sprig thyme",
    spices: ["1 tbsp jerk seasoning", "1 tsp allspice", "½ tsp black pepper"],
    sauces: ["¼ cup coconut milk", "juice of 1 lime"],
    garnish: "sliced scallions, lime wedge, hot sauce on the side",
    starchBase: "rice and peas or fried plantains",
  },
  african: {
    oil: "2 tbsp peanut oil (or vegetable oil)",
    aromatics: "1 onion (diced), 3 cloves garlic (minced), 1 inch ginger (grated), 1 habanero (seeded, minced — optional)",
    spices: ["1 tsp cumin", "1 tsp coriander", "½ tsp turmeric", "1 tsp berbere spice (or paprika + cayenne)"],
    sauces: ["2 tbsp tomato paste", "¼ cup peanut butter (for groundnut dishes)"],
    garnish: "fresh cilantro, crushed peanuts",
    starchBase: "fufu or cooked white rice",
  },
  seafood: {
    oil: "2 tbsp olive oil + 1 tbsp butter",
    aromatics: "2 shallots (minced), 3 cloves garlic (sliced), zest of 1 lemon",
    spices: ["½ tsp Old Bay seasoning", "¼ tsp cayenne", "½ tsp paprika"],
    sauces: ["juice of 1 lemon", "2 tbsp white wine", "1 tbsp capers"],
    garnish: "fresh dill, lemon wedge, capers",
    starchBase: "roasted potatoes or crusty bread",
  },
  southeast_asian: {
    oil: "1 tbsp coconut oil + 1 tbsp vegetable oil",
    aromatics: "3 cloves garlic (minced), 1 stalk lemongrass (bruised), 2 Thai chilies (sliced), 4 makrut lime leaves",
    spices: ["1 tsp turmeric", "1 tbsp curry paste (red or green)"],
    sauces: ["2 tbsp fish sauce", "1 tbsp palm sugar (or brown sugar)", "¼ cup coconut milk"],
    garnish: "Thai basil, crushed peanuts, lime wedge",
    starchBase: "2 cups cooked jasmine rice or rice noodles",
  },
};

// ─── PROTEIN COOKING GUIDES ────────────────────────────────────
interface ProteinGuide {
  amount: string;
  prep: string;
  cookMethod: string;
  doneCue: string;
  cookTimeMin: number;
  ingredients: string[];
}

const PROTEIN_GUIDES: Record<string, ProteinGuide> = {
  Chicken: {
    amount: "1 lb boneless skinless chicken thighs",
    prep: "Pat chicken dry with paper towels. Season both sides generously with salt and pepper.",
    cookMethod: "Place chicken presentation-side down in the hot pan. Cook undisturbed 5-6 minutes until golden. Flip and cook 4-5 more minutes.",
    doneCue: "Internal temperature reaches 165°F, juices run clear when pierced",
    cookTimeMin: 12,
    ingredients: ["1 lb boneless skinless chicken thighs", "½ tsp salt", "¼ tsp black pepper"],
  },
  Beef: {
    amount: "1 lb beef (NY strip or sirloin), 1 inch thick",
    prep: "Remove steak from fridge 30 minutes before cooking. Pat completely dry. Season liberally with salt and pepper on both sides.",
    cookMethod: "Sear in a screaming hot cast iron pan with oil. Cook 3-4 minutes per side for medium-rare. Rest 5 minutes before slicing against the grain.",
    doneCue: "Internal temp 130°F for medium-rare — firm but springs back when pressed",
    cookTimeMin: 15,
    ingredients: ["1 lb NY strip steak (1 inch thick)", "1 tsp kosher salt", "½ tsp coarse black pepper"],
  },
  "Ground Beef": {
    amount: "1 lb ground beef (80/20)",
    prep: "Break ground beef into small chunks — do not pre-mix or overwork.",
    cookMethod: "Add to hot pan in an even layer. Let it sear without stirring for 3 minutes until browned underneath. Break apart and stir, cooking 4-5 more minutes until no pink remains. Drain excess fat.",
    doneCue: "Fully browned, no pink visible, fat rendered out",
    cookTimeMin: 8,
    ingredients: ["1 lb ground beef (80/20)", "½ tsp salt", "¼ tsp black pepper"],
  },
  Pork: {
    amount: "1 lb pork tenderloin (or 4 bone-in chops)",
    prep: "Pat pork dry. Season all sides with salt, pepper, and a pinch of brown sugar.",
    cookMethod: "Sear in hot pan 2-3 minutes per side until golden brown. For tenderloin, finish in a 400°F oven for 12-15 minutes.",
    doneCue: "Internal temperature hits 145°F — slightly pink in center is perfect and safe",
    cookTimeMin: 15,
    ingredients: ["1 lb pork tenderloin", "1 tsp salt", "½ tsp black pepper", "1 tsp brown sugar"],
  },
  Lamb: {
    amount: "1 lb lamb leg steaks (or 8 lamb lollipop chops)",
    prep: "Trim excess fat. Season with salt, pepper, and rosemary. Let sit at room temp 20 minutes.",
    cookMethod: "Sear in a very hot skillet with olive oil, 3-4 minutes per side for medium. Rest 5 minutes.",
    doneCue: "Internal temp 135°F for medium — slightly springy when pressed",
    cookTimeMin: 12,
    ingredients: ["1 lb lamb leg steaks", "1 tsp salt", "½ tsp black pepper", "1 sprig fresh rosemary (chopped)"],
  },
  Salmon: {
    amount: "2 salmon fillets (6 oz each, skin-on)",
    prep: "Pat salmon completely dry — this is crucial for crispy skin. Season flesh side with salt and pepper.",
    cookMethod: "Place skin-side down in a medium-high pan with oil. Press gently with spatula for first 30 seconds to prevent curling. Cook 4 minutes skin-side down without moving. Flip and cook 2 more minutes.",
    doneCue: "Flesh is opaque on the outside, slightly translucent in the very center — it will carry-over cook",
    cookTimeMin: 7,
    ingredients: ["2 salmon fillets (6 oz each, skin-on)", "½ tsp salt", "¼ tsp black pepper"],
  },
  Shrimp: {
    amount: "1 lb large shrimp (peeled, deveined, tail-on)",
    prep: "Pat shrimp very dry. Toss with salt, pepper, and a pinch of paprika.",
    cookMethod: "Spread shrimp in a single layer in the hot pan — do NOT crowd them. Cook 2 minutes without touching until pink on the bottom. Flip and cook 1-2 more minutes.",
    doneCue: "Shrimp are pink, C-shaped (not O-shaped — that's overcooked), and opaque throughout",
    cookTimeMin: 4,
    ingredients: ["1 lb large shrimp (peeled, deveined)", "½ tsp salt", "¼ tsp paprika"],
  },
  Tuna: {
    amount: "2 ahi tuna steaks (6 oz each, sushi-grade)",
    prep: "Pat tuna completely dry. Brush lightly with oil. Season all sides with salt and pepper.",
    cookMethod: "Sear in a screaming hot pan (nearly smoking) for 60-90 seconds per side. The center should remain raw/rare.",
    doneCue: "Deep sear on outside, ruby red center — do NOT overcook",
    cookTimeMin: 4,
    ingredients: ["2 ahi tuna steaks (6 oz, sushi-grade)", "½ tsp salt", "½ tsp black pepper"],
  },
  Tilapia: {
    amount: "2 tilapia fillets (6 oz each)",
    prep: "Pat fillets dry. Season with salt, pepper, and a dusting of garlic powder.",
    cookMethod: "Place in hot pan with oil. Cook 3 minutes per side — do not flip more than once. The fish is delicate.",
    doneCue: "Fish flakes easily with a fork and is opaque white throughout",
    cookTimeMin: 6,
    ingredients: ["2 tilapia fillets (6 oz each)", "½ tsp salt", "¼ tsp garlic powder"],
  },
  Fish: {
    amount: "2 white fish fillets (6 oz each — cod, halibut, or similar)",
    prep: "Pat fillets dry. Season with salt, pepper, and a squeeze of lemon.",
    cookMethod: "Place in hot pan with olive oil and butter. Cook 3-4 minutes per side, basting with the pan butter using a spoon.",
    doneCue: "Fish flakes easily with a fork and is opaque throughout",
    cookTimeMin: 8,
    ingredients: ["2 white fish fillets (6 oz each)", "½ tsp salt", "¼ tsp black pepper", "1 tbsp butter"],
  },
  Seafood: {
    amount: "1 lb mixed seafood (shrimp, scallops, or crab meat)",
    prep: "Pat all seafood dry. Season lightly with salt and Old Bay.",
    cookMethod: "Cook in batches to avoid crowding. Sear scallops 2 min per side. Shrimp 2 min per side. Crab meat: gently warm through.",
    doneCue: "Scallops: golden crust. Shrimp: pink C-shape. All opaque.",
    cookTimeMin: 8,
    ingredients: ["1 lb mixed seafood", "½ tsp salt", "½ tsp Old Bay seasoning"],
  },
  Duck: {
    amount: "2 duck breasts (skin-on)",
    prep: "Score the skin in a crosshatch pattern with a sharp knife — cut through fat but not into meat. Season both sides with salt.",
    cookMethod: "Start skin-side down in a COLD pan. Turn heat to medium. Render fat for 8-10 minutes until skin is deep golden and crispy. Flip and cook 3-4 minutes for medium-rare.",
    doneCue: "Skin is crackling crispy, internal temp 130-135°F for medium-rare. Rest 5 minutes before slicing.",
    cookTimeMin: 15,
    ingredients: ["2 duck breasts (skin-on)", "1 tsp kosher salt", "½ tsp black pepper"],
  },
  Turkey: {
    amount: "1 lb ground turkey (or turkey cutlets)",
    prep: "For ground: break into chunks. For cutlets: pound to even ½-inch thickness between plastic wrap. Season with salt and pepper.",
    cookMethod: "Cook ground turkey over medium-high, breaking apart, 6-7 minutes. For cutlets: sear 3-4 minutes per side.",
    doneCue: "No pink remaining, internal temp 165°F",
    cookTimeMin: 8,
    ingredients: ["1 lb ground turkey", "½ tsp salt", "¼ tsp black pepper"],
  },
  Eggs: {
    amount: "4 large eggs",
    prep: "Crack eggs into a bowl. For scrambled: whisk with a fork until just combined (don't overbeat). For fried/poached: crack individually.",
    cookMethod: "Scrambled: low heat, stir gently with spatula in large curds, remove from heat while still slightly wet. Fried: medium heat, cover 2 min for over-easy.",
    doneCue: "Scrambled: soft, creamy curds barely set. Fried: whites fully set, yolk still runny",
    cookTimeMin: 5,
    ingredients: ["4 large eggs", "1 tbsp butter", "pinch of salt"],
  },
  "Plant Based": {
    amount: "1 block (14 oz) extra-firm tofu (or 2 cups mixed vegetables)",
    prep: "Press tofu: wrap in paper towels, place heavy pan on top for 15 minutes. Cut into ¾-inch cubes.",
    cookMethod: "Toss tofu cubes with cornstarch. Pan-fry in hot oil 3-4 minutes per side until golden and crispy on all edges.",
    doneCue: "Tofu is golden brown and crispy on the outside, holds its shape when picked up",
    cookTimeMin: 12,
    ingredients: ["1 block (14 oz) extra-firm tofu", "2 tbsp cornstarch", "2 tbsp vegetable oil"],
  },
};

// ─── DISH TYPE DETECTION + TEMPLATES ────────────────────────────

type DishType = "omelette" | "scramble" | "toast" | "pancake" | "waffle" | "oatmeal" | "bowl" | "stir_fry" | "fried_rice" | "tacos" | "burrito" | "quesadilla" | "enchilada" | "curry" | "soup" | "stew" | "salad" | "sandwich" | "pasta" | "rice_dish" | "grilled" | "roasted" | "fried" | "wrap" | "pizza" | "noodles" | "kebab" | "casserole" | "hash" | "smoothie" | "pudding" | "mash" | "porridge" | "frittata" | "benedict" | "french_toast" | "crepe" | "bao" | "dumpling" | "flatbread" | "general";

function detectDishType(name: string): DishType {
  const n = name.toLowerCase();
  if (n.includes("omelette") || n.includes("omelet")) return "omelette";
  if (n.includes("scramble") || n.includes("scrambled") || n.includes("bhurji")) return "scramble";
  if (n.includes("french toast") || n.includes("brioche")) return "french_toast";
  if (n.includes("benedict")) return "benedict";
  if (n.includes("toast") && !n.includes("french")) return "toast";
  if (n.includes("pancake") || n.includes("hotcake") || n.includes("chilla")) return "pancake";
  if (n.includes("waffle")) return "waffle";
  if (n.includes("oatmeal") || n.includes("oats") || n.includes("porridge") || n.includes("muesli")) return "oatmeal";
  if (n.includes("smoothie") || n.includes("acai")) return "smoothie";
  if (n.includes("pudding") || n.includes("chia")) return "pudding";
  if (n.includes("frittata")) return "frittata";
  if (n.includes("crepe") || n.includes("blintze")) return "crepe";
  if (n.includes("bao") || n.includes("bun")) return "bao";
  if (n.includes("dumpling") || n.includes("gyoza") || n.includes("momo")) return "dumpling";
  if (n.includes("stir fry") || n.includes("stir-fry")) return "stir_fry";
  if (n.includes("fried rice")) return "fried_rice";
  if (n.includes("taco")) return "tacos";
  if (n.includes("burrito")) return "burrito";
  if (n.includes("quesadilla")) return "quesadilla";
  if (n.includes("enchilada") || n.includes("chilaquiles")) return "enchilada";
  if (n.includes("curry") || n.includes("tikka") || n.includes("masala") || n.includes("korma") || n.includes("vindaloo") || n.includes("dal") || n.includes("daal")) return "curry";
  if (n.includes("soup") || n.includes("pho") || n.includes("ramen") || n.includes("pozole") || n.includes("laksa") || n.includes("tom") || n.includes("chowder") || n.includes("bisque")) return "soup";
  if (n.includes("stew") || n.includes("gumbo") || n.includes("tagine") || n.includes("chili")) return "stew";
  if (n.includes("salad") || n.includes("poke")) return "salad";
  if (n.includes("sandwich") || n.includes("bagel") || n.includes("burger") || n.includes("melt") || n.includes("club") || n.includes("monte cristo") || n.includes("croque")) return "sandwich";
  if (n.includes("pasta") || n.includes("spaghetti") || n.includes("penne") || n.includes("linguine") || n.includes("fettuccine") || n.includes("rigatoni") || n.includes("mac &") || n.includes("mac and") || n.includes("lasagna") || n.includes("gnocchi") || n.includes("ravioli") || n.includes("bolognese") || n.includes("carbonara") || n.includes("aglio") || n.includes("puttanesca") || n.includes("cacio")) return "pasta";
  if (n.includes("noodle") || n.includes("pad thai") || n.includes("lo mein") || n.includes("chow") || n.includes("japchae") || n.includes("udon") || n.includes("soba") || n.includes("dan dan")) return "noodles";
  if (n.includes("pizza") || n.includes("flatbread")) return "pizza";
  if (n.includes("kebab") || n.includes("kabob") || n.includes("skewer") || n.includes("satay")) return "kebab";
  if (n.includes("casserole") || n.includes("bake") || n.includes("gratin")) return "casserole";
  if (n.includes("hash")) return "hash";
  if (n.includes("wrap") || n.includes("roll")) return "wrap";
  if (n.includes("rice") || n.includes("risotto") || n.includes("biryani") || n.includes("paella") || n.includes("jambalaya") || n.includes("jollof") || n.includes("pilaf")) return "rice_dish";
  if (n.includes("grill") || n.includes("bbq") || n.includes("asada") || n.includes("jerk")) return "grilled";
  if (n.includes("roast") || n.includes("baked")) return "roasted";
  if (n.includes("fried") || n.includes("fries") || n.includes("fritter") || n.includes("nugget") || n.includes("fish stick") || n.includes("taquito") || n.includes("akara") || n.includes("tempura") || n.includes("katsu") || n.includes("schnitzel") || n.includes("tonkatsu")) return "fried";
  if (n.includes("bowl")) return "bowl";
  if (n.includes("arepa") || n.includes("paratha") || n.includes("naan") || n.includes("roti") || n.includes("cachapa") || n.includes("pupusa")) return "flatbread";
  if (n.includes("shakshuka")) return "stew";
  if (n.includes("mash") || n.includes("puree")) return "mash";
  return "general";
}

// ─── SPECIFIC INGREDIENT GENERATORS ─────────────────────────────

function getSpecificIngredients(name: string, cuisine: string, protein: string | null, dishType: DishType): string[] {
  const cp = CUISINE_PROFILES[cuisine] || CUISINE_PROFILES.american;
  const pg = protein ? PROTEIN_GUIDES[protein] : null;
  const ingredients: string[] = [];

  // Add protein ingredients
  if (pg) {
    ingredients.push(...pg.ingredients);
  }

  // Add oil
  ingredients.push(cp.oil);

  // Add dish-specific ingredients based on type and name
  const n = name.toLowerCase();

  switch (dishType) {
    case "omelette":
    case "scramble":
      if (!pg || protein !== "Eggs") ingredients.push("4 large eggs", "1 tbsp butter", "pinch of salt");
      if (n.includes("cheese") || n.includes("western")) ingredients.push("¼ cup shredded cheddar cheese");
      if (n.includes("bacon")) ingredients.push("3 strips thick-cut bacon (diced)");
      if (n.includes("mushroom")) ingredients.push("4 oz cremini mushrooms (sliced)");
      if (n.includes("spinach")) ingredients.push("1 cup fresh baby spinach");
      if (n.includes("pepper") || n.includes("western")) ingredients.push("½ bell pepper (diced)");
      if (n.includes("ham") || n.includes("western")) ingredients.push("¼ cup diced ham");
      if (n.includes("chorizo")) ingredients.push("3 oz Mexican chorizo (removed from casing)");
      if (n.includes("corn") || n.includes("street")) ingredients.push("½ cup corn kernels", "2 tbsp cotija cheese", "½ tsp tajín");
      if (n.includes("truffle")) ingredients.push("1 tsp truffle oil", "2 oz wild mushrooms");
      break;

    case "toast":
      ingredients.push("2 slices thick sourdough bread (toasted)");
      if (n.includes("avocado")) ingredients.push("1 ripe avocado", "½ tsp flaky sea salt", "¼ tsp red pepper flakes", "squeeze of lemon");
      if (n.includes("egg") || n.includes("poach")) ingredients.push("2 eggs", "1 tbsp white vinegar (for poaching)");
      if (n.includes("bean") || n.includes("black bean")) ingredients.push("½ cup canned black beans (drained, rinsed)", "¼ tsp cumin");
      if (n.includes("salmon") || n.includes("lox")) ingredients.push("3 oz smoked salmon", "2 tbsp cream cheese", "1 tbsp capers");
      break;

    case "pancake":
      ingredients.push("1½ cups all-purpose flour", "2 tbsp sugar", "2 tsp baking powder", "½ tsp salt", "1¼ cups milk", "1 egg", "3 tbsp melted butter", "maple syrup for serving");
      if (n.includes("banana")) ingredients.push("2 ripe bananas (mashed)");
      if (n.includes("blueberry")) ingredients.push("¾ cup fresh blueberries");
      if (n.includes("chocolate")) ingredients.push("½ cup chocolate chips");
      if (n.includes("protein")) ingredients.push("1 scoop vanilla protein powder");
      if (n.includes("buckwheat")) { ingredients.splice(ingredients.indexOf("1½ cups all-purpose flour"), 1); ingredients.push("1 cup buckwheat flour", "½ cup all-purpose flour"); }
      if (n.includes("oat") || n.includes("banana oat")) ingredients.push("1 cup rolled oats");
      if (n.includes("chickpea") || n.includes("besan")) { ingredients.splice(0, ingredients.length); ingredients.push("1 cup chickpea flour (besan)", "¾ cup water", "½ onion (finely diced)", "1 green chili (minced)", "2 tbsp fresh cilantro (chopped)", "½ tsp turmeric", "½ tsp cumin", "½ tsp salt", "2 tbsp oil"); }
      break;

    case "waffle":
      ingredients.push("2 cups all-purpose flour", "2 tbsp sugar", "1 tbsp baking powder", "½ tsp salt", "2 eggs (separated)", "1¾ cups milk", "½ cup melted butter", "1 tsp vanilla extract");
      if (n.includes("blueberry")) ingredients.push("¾ cup fresh blueberries");
      if (n.includes("chicken")) ingredients.push("2 boneless chicken thighs", "1 cup buttermilk", "1 cup flour for dredging", "oil for frying");
      break;

    case "oatmeal":
      ingredients.push("1 cup rolled oats", "2 cups water (or milk)", "pinch of salt");
      if (n.includes("banana")) ingredients.push("1 banana (sliced)", "2 tbsp chopped walnuts");
      if (n.includes("cinnamon")) ingredients.push("1 tsp cinnamon", "2 tbsp brown sugar", "drizzle of cream cheese glaze");
      if (n.includes("chai")) ingredients.push("½ tsp cinnamon", "¼ tsp cardamom", "¼ tsp ginger", "pinch of cloves", "1 tbsp honey");
      if (n.includes("berry") || n.includes("berries")) ingredients.push("½ cup mixed berries", "1 tbsp honey");
      break;

    case "smoothie":
      if (n.includes("acai")) ingredients.push("2 frozen acai packets", "1 banana", "½ cup frozen berries", "½ cup almond milk", "granola and sliced fruit for topping");
      else ingredients.push("1 banana", "1 cup frozen fruit", "1 cup milk or yogurt", "1 tbsp honey");
      break;

    case "pudding":
      if (n.includes("chia")) ingredients.push("¼ cup chia seeds", "1 cup coconut milk", "1 tbsp honey", "½ tsp vanilla", "diced mango for topping");
      else ingredients.push("¼ cup pudding base", "1 cup milk", "toppings of choice");
      break;

    case "french_toast":
      ingredients.push("4 thick slices brioche (or challah) bread", "3 eggs", "¾ cup whole milk", "1 tsp vanilla extract", "1 tsp cinnamon", "2 tbsp butter", "maple syrup and powdered sugar for serving");
      break;

    case "benedict":
      ingredients.push("2 English muffins (split, toasted)", "4 eggs", "4 slices Canadian bacon (or ham)");
      ingredients.push("3 egg yolks", "1 tbsp lemon juice", "½ cup melted butter", "pinch of cayenne (for hollandaise)");
      if (n.includes("salmon") || n.includes("smoked")) { ingredients.push("4 oz smoked salmon"); }
      if (n.includes("crab")) ingredients.push("6 oz lump crab meat", "1 tbsp mayo", "1 tsp Old Bay");
      if (n.includes("avocado")) ingredients.push("1 ripe avocado (sliced)");
      break;

    case "frittata":
      ingredients.push("8 large eggs", "¼ cup whole milk", "½ tsp salt", "¼ tsp pepper");
      if (n.includes("vegetable") || n.includes("veggie")) ingredients.push("1 cup mixed vegetables (zucchini, bell pepper, onion — diced)", "¼ cup crumbled goat cheese");
      else ingredients.push("½ cup filling ingredients (diced)", "¼ cup cheese");
      break;

    case "tacos":
      ingredients.push("8 small corn tortillas (warmed)");
      if (n.includes("fish")) ingredients.push("1 lb white fish fillets", "1 cup shredded cabbage", "¼ cup crema", "1 lime");
      if (n.includes("carnitas")) ingredients.push("2 lbs pork shoulder (cubed)", "1 orange (juiced)", "1 tsp cumin", "1 tsp oregano");
      if (n.includes("birria")) ingredients.push("2 lbs beef chuck (cubed)", "4 dried guajillo chiles", "2 dried ancho chiles", "1 cup beef broth");
      if (n.includes("steak") || n.includes("asada")) ingredients.push("1 lb flank steak", "juice of 2 limes", "3 cloves garlic", "1 bunch cilantro");
      if (n.includes("breakfast")) ingredients.push("4 eggs (scrambled)", "4 strips bacon (crumbled)", "¼ cup shredded cheese");
      if (n.includes("shrimp")) ingredients.push("1 lb shrimp", "1 tsp chili powder", "½ tsp garlic powder");
      if (n.includes("chicken")) ingredients.push("1 lb chicken thighs (sliced)", "1 tsp cumin", "1 tsp chili powder");
      if (n.includes("al pastor")) ingredients.push("1 lb pork shoulder (thinly sliced)", "2 tbsp achiote paste", "½ cup pineapple (diced)");
      ingredients.push("½ cup diced white onion", "¼ cup fresh cilantro", "1 lime (cut into wedges)", "salsa of choice");
      break;

    case "burrito":
      ingredients.push("2 large flour tortillas (12-inch)", "1 cup cooked rice", "½ cup canned black beans (drained)", "¼ cup shredded cheese", "2 tbsp sour cream", "salsa");
      if (n.includes("chicken")) ingredients.push("1 lb chicken (seasoned, cooked, shredded)");
      if (n.includes("beef") || n.includes("steak")) ingredients.push("1 lb steak (sliced) or ground beef");
      if (n.includes("breakfast")) ingredients.push("4 eggs (scrambled)", "3 strips bacon (crumbled)");
      break;

    case "quesadilla":
      ingredients.push("2 large flour tortillas", "1½ cups shredded Mexican blend cheese");
      if (n.includes("chicken")) ingredients.push("1 cup cooked shredded chicken");
      if (n.includes("steak")) ingredients.push("6 oz sliced cooked steak");
      if (n.includes("pizza")) ingredients.push("¼ cup pepperoni slices", "¼ cup pizza sauce for dipping");
      if (n.includes("mushroom")) ingredients.push("1 cup sliced mushrooms (sautéed)");
      break;

    case "enchilada":
      if (n.includes("chilaquiles")) {
        ingredients.push("8 corn tortillas (cut into triangles, fried or baked until crispy)", "2 cups salsa (verde or roja)", "2 eggs", "¼ cup crumbled queso fresco", "¼ cup Mexican crema", "½ white onion (sliced into rings)");
        if (n.includes("pollo") || n.includes("chicken")) ingredients.push("1 cup shredded cooked chicken");
      } else {
        ingredients.push("8 corn tortillas", "2 cups enchilada sauce (red or green)", "1½ cups shredded cheese", "½ cup sour cream");
        if (n.includes("chicken")) ingredients.push("2 cups shredded cooked chicken");
      }
      break;

    case "curry":
      ingredients.push("1 can (14 oz) coconut milk", "1 cup diced tomatoes");
      if (n.includes("dal") || n.includes("daal") || n.includes("lentil")) ingredients.push("1 cup red lentils (rinsed)", "3 cups water");
      if (n.includes("chickpea") || n.includes("chana")) ingredients.push("2 cans (15 oz) chickpeas (drained)");
      if (n.includes("paneer")) ingredients.push("8 oz paneer (cubed)");
      if (n.includes("butter chicken") || n.includes("murgh")) ingredients.push("1 lb chicken thighs (cubed)", "½ cup heavy cream", "2 tbsp butter", "2 tbsp tomato paste");
      if (n.includes("green") || n.includes("thai green")) ingredients.push("3 tbsp green curry paste", "1 lb chicken thighs (sliced)", "1 cup Thai basil");
      if (n.includes("red") || n.includes("thai red")) ingredients.push("3 tbsp red curry paste", "1 cup bamboo shoots");
      if (n.includes("massaman")) ingredients.push("3 tbsp massaman curry paste", "1 lb beef chuck (cubed)", "2 potatoes (cubed)", "¼ cup roasted peanuts");
      break;

    case "soup":
      ingredients.push("4 cups broth (chicken or vegetable)");
      if (n.includes("pho")) ingredients.push("8 oz rice noodles", "1 lb beef sirloin (sliced paper-thin)", "1 onion (halved, charred)", "3 star anise", "1 cinnamon stick", "2 tbsp fish sauce", "bean sprouts, Thai basil, lime, hoisin for serving");
      if (n.includes("ramen")) ingredients.push("2 packs fresh ramen noodles", "2 soft-boiled eggs", "4 oz chashu pork (or sliced pork belly)", "2 sheets nori", "2 tbsp soy sauce", "1 tbsp miso paste", "sliced scallions");
      if (n.includes("laksa")) ingredients.push("8 oz rice vermicelli", "3 tbsp laksa paste", "1 can coconut milk", "1 lb shrimp", "2 tbsp fish sauce", "bean sprouts, cilantro, lime");
      if (n.includes("tomato")) ingredients.push("2 cans (28 oz) San Marzano tomatoes", "1 cup heavy cream", "2 tbsp butter", "fresh basil");
      if (n.includes("chicken")) ingredients.push("2 chicken breasts", "2 carrots (diced)", "2 stalks celery (diced)", "egg noodles or rice");
      if (n.includes("pozole")) ingredients.push("2 lbs pork shoulder", "1 can (29 oz) hominy (drained)", "4 dried guajillo chiles", "cabbage, radish, oregano for serving");
      if (n.includes("miso")) ingredients.push("3 tbsp white miso paste", "4 oz silken tofu (cubed)", "2 sheets wakame seaweed", "sliced scallions");
      if (n.includes("egg drop")) ingredients.push("3 eggs (beaten)", "1 tbsp cornstarch mixed with 2 tbsp water", "1 tsp sesame oil");
      if (n.includes("chowder")) ingredients.push("1 lb clams or corn kernels", "2 potatoes (diced)", "4 strips bacon", "1 cup heavy cream");
      break;

    case "stew":
      ingredients.push("2 cups broth or stock");
      if (n.includes("shakshuka")) ingredients.push("1 can (28 oz) crushed tomatoes", "1 tsp cumin", "1 tsp paprika", "½ tsp cayenne", "4 eggs", "¼ cup crumbled feta", "fresh cilantro", "crusty bread for serving");
      if (n.includes("gumbo")) ingredients.push("1 lb andouille sausage (sliced)", "1 lb shrimp", "¼ cup flour + ¼ cup oil (for roux)", "1 cup okra", "the holy trinity: 1 onion, 1 bell pepper, 2 stalks celery (all diced)", "file powder", "cooked white rice");
      if (n.includes("chili")) ingredients.push("1 lb ground beef", "2 cans kidney beans (drained)", "1 can (28 oz) crushed tomatoes", "2 tbsp chili powder", "1 tsp cumin", "sour cream and cheddar for topping");
      if (n.includes("tagine")) ingredients.push("1 lb lamb (cubed)", "1 preserved lemon (diced)", "½ cup green olives", "1 tsp ras el hanout", "1 tsp cinnamon", "2 tbsp honey");
      break;

    case "stir_fry":
      if (!pg) ingredients.push("1 lb protein of your section");
      ingredients.push("2 cups mixed vegetables (broccoli, bell pepper, snap peas, carrots — bite-sized)", "2 tbsp soy sauce", "1 tbsp oyster sauce", "1 tsp cornstarch mixed with 2 tbsp water");
      break;

    case "fried_rice":
      ingredients.push("3 cups day-old cooked rice (cold)", "2 eggs (beaten)", "1 cup mixed vegetables (peas, carrots, corn)", "3 tbsp soy sauce", "1 tbsp sesame oil");
      if (n.includes("chicken")) ingredients.push("1 cup cooked chicken (diced)");
      if (n.includes("shrimp")) ingredients.push("½ lb shrimp");
      if (n.includes("kimchi")) ingredients.push("1 cup kimchi (chopped)", "1 tbsp gochujang");
      break;

    case "pasta":
      ingredients.push("12 oz pasta", "salt for pasta water");
      if (n.includes("aglio")) ingredients.push("6 cloves garlic (thinly sliced)", "½ tsp red pepper flakes", "¼ cup extra virgin olive oil", "¼ cup reserved pasta water", "fresh parsley");
      if (n.includes("carbonara")) ingredients.push("6 oz guanciale or pancetta (diced)", "3 egg yolks + 1 whole egg", "1 cup grated Pecorino Romano", "freshly cracked black pepper");
      if (n.includes("bolognese") || n.includes("meatball")) ingredients.push("1 lb ground beef", "1 can (28 oz) San Marzano tomatoes", "½ cup whole milk", "½ cup dry white wine", "1 carrot, 1 celery stalk, 1 onion (all finely diced)");
      if (n.includes("pesto")) ingredients.push("2 cups fresh basil", "⅓ cup pine nuts", "2 cloves garlic", "½ cup grated Parmesan", "½ cup extra virgin olive oil");
      if (n.includes("mac") && n.includes("cheese")) ingredients.push("3 tbsp butter", "3 tbsp flour", "2½ cups whole milk", "2 cups sharp cheddar (shredded)", "1 cup gruyère (shredded)", "½ tsp mustard powder");
      if (n.includes("cacio")) ingredients.push("2 cups finely grated Pecorino Romano", "2 tsp freshly cracked black pepper");
      if (n.includes("puttanesca")) ingredients.push("1 can (14 oz) diced tomatoes", "¼ cup Kalamata olives (halved)", "2 tbsp capers", "4 anchovy fillets", "½ tsp red pepper flakes");
      if (n.includes("alfredo") || n.includes("fettuccine")) ingredients.push("1 cup heavy cream", "1 cup grated Parmesan", "3 tbsp butter", "2 cloves garlic (minced)");
      break;

    case "noodles":
      if (n.includes("pad thai")) ingredients.push("8 oz flat rice noodles (soaked in warm water 20 min)", "½ lb shrimp (or chicken)", "2 eggs", "1 cup bean sprouts", "3 tbsp tamarind paste", "2 tbsp fish sauce", "1 tbsp sugar", "3 tbsp crushed peanuts", "2 limes", "3 scallions (cut into 2-inch pieces)");
      else if (n.includes("dan dan")) ingredients.push("12 oz Chinese egg noodles", "½ lb ground pork", "2 tbsp chili oil", "2 tbsp soy sauce", "1 tbsp Chinese black vinegar", "2 tbsp tahini (or Chinese sesame paste)", "1 tsp Sichuan peppercorns (ground)", "preserved mustard greens");
      else if (n.includes("lo mein")) ingredients.push("12 oz lo mein noodles", "1 lb protein (sliced)", "2 cups vegetables (bok choy, mushrooms, carrots)", "3 tbsp soy sauce", "1 tbsp oyster sauce", "1 tsp sesame oil");
      else if (n.includes("japchae")) ingredients.push("8 oz glass noodles (sweet potato starch)", "4 oz beef (sliced thin)", "1 cup spinach", "1 carrot (julienned)", "4 shiitake mushrooms (sliced)", "2 tbsp soy sauce", "1 tbsp sesame oil", "1 tbsp sugar");
      else if (n.includes("peanut")) ingredients.push("12 oz noodles (soba or linguine)", "¼ cup peanut butter", "2 tbsp soy sauce", "1 tbsp rice vinegar", "1 tbsp sriracha", "1 tbsp honey", "cucumber and scallions for topping");
      else if (n.includes("chili oil")) ingredients.push("12 oz Chinese wheat noodles", "3 tbsp chili oil (with sediment)", "2 tbsp soy sauce", "1 tbsp black vinegar", "1 tsp sugar", "2 cloves garlic (minced)", "crushed peanuts and scallions");
      else ingredients.push("12 oz noodles", "sauce ingredients per cuisine");
      break;

    case "salad":
      if (n.includes("caesar")) ingredients.push("1 head romaine lettuce (chopped)", "½ cup croutons", "⅓ cup shaved Parmesan");
      if (n.includes("greek")) ingredients.push("1 English cucumber (diced)", "2 cups cherry tomatoes (halved)", "½ red onion (sliced)", "½ cup Kalamata olives", "4 oz feta cheese (block, crumbled)", "2 tbsp red wine vinegar", "¼ cup extra virgin olive oil", "1 tsp dried oregano");
      if (n.includes("poke")) ingredients.push("12 oz sushi-grade ahi tuna (cubed)", "2 cups sushi rice", "¼ cup soy sauce", "1 tbsp sesame oil", "1 avocado (sliced)", "1 cup edamame", "nori strips, sesame seeds, furikake");
      if (n.includes("cobb")) ingredients.push("mixed greens", "2 chicken breasts (grilled, sliced)", "4 strips bacon (crumbled)", "2 hard-boiled eggs", "1 avocado (diced)", "½ cup cherry tomatoes", "¼ cup blue cheese");
      break;

    case "sandwich":
      if (n.includes("bagel")) {
        ingredients.push("2 bagels (sliced, toasted)");
        if (n.includes("cream cheese")) ingredients.push("3 tbsp cream cheese");
        if (n.includes("salmon") || n.includes("lox")) ingredients.push("4 oz smoked salmon", "1 tbsp capers", "thinly sliced red onion");
        if (n.includes("egg")) ingredients.push("2 eggs (fried or scrambled)", "1 slice American cheese", "2 strips bacon");
      } else if (n.includes("burger")) {
        ingredients.push("1 lb ground beef (formed into 2 patties)", "2 brioche buns (toasted)", "2 slices cheddar cheese", "lettuce, tomato, onion slices", "ketchup, mustard, mayo");
      } else if (n.includes("croque")) {
        ingredients.push("4 slices thick white bread", "4 slices ham", "1 cup gruyère (shredded)", "2 tbsp butter", "2 tbsp flour", "1 cup milk", "1 tsp Dijon mustard");
        if (n.includes("madame")) ingredients.push("2 eggs (for topping)");
      } else if (n.includes("monte cristo")) {
        ingredients.push("4 slices thick white bread", "4 slices ham", "4 slices Swiss cheese", "2 eggs", "¼ cup milk", "2 tbsp butter", "powdered sugar and jam for serving");
      } else {
        ingredients.push("bread of choice", "filling per recipe name");
      }
      break;

    case "rice_dish":
      ingredients.push("2 cups long-grain rice (rinsed until water runs clear)");
      if (n.includes("biryani")) ingredients.push("1 lb chicken thighs (or lamb)", "1 cup yogurt", "2 tbsp biryani masala", "1 tsp saffron soaked in 2 tbsp warm milk", "3 tbsp ghee", "fried onions for layering", "fresh mint and cilantro");
      if (n.includes("risotto")) { ingredients.splice(0, 1); ingredients.push("1½ cups Arborio rice", "½ cup dry white wine", "4 cups warm chicken broth (kept simmering)", "½ cup grated Parmesan", "2 tbsp butter"); }
      if (n.includes("paella")) ingredients.push("1 lb mixed seafood (shrimp, mussels, calamari)", "4 oz chorizo (sliced)", "1 can (14 oz) diced tomatoes", "large pinch saffron threads", "1 cup frozen peas", "4 cups chicken broth");
      if (n.includes("jollof")) ingredients.push("1 can (14 oz) diced tomatoes", "2 red bell peppers (roasted, blended)", "1 scotch bonnet pepper", "2 tbsp tomato paste", "1 tsp thyme", "2 bay leaves", "2 cups chicken broth");
      if (n.includes("jambalaya")) ingredients.push("1 lb andouille sausage (sliced)", "1 lb shrimp", "the holy trinity: 1 onion, 1 green bell pepper, 2 stalks celery", "1 can (14 oz) diced tomatoes", "2 tsp Cajun seasoning", "3 cups chicken broth");
      break;

    case "bowl":
      ingredients.push(cp.starchBase);
      if (!pg) ingredients.push("1 cup protein (cooked, sliced)");
      ingredients.push("1 cup mixed vegetables or toppings", "sauce or dressing per cuisine");
      if (n.includes("buddha") || n.includes("grain")) ingredients.push("½ cup chickpeas (roasted)", "½ avocado", "¼ cup hummus", "mixed greens");
      if (n.includes("poke")) ingredients.push("8 oz sushi-grade tuna (cubed)", "2 tbsp soy sauce", "1 tsp sesame oil", "avocado, edamame, sesame seeds");
      break;

    case "grilled":
      if (!pg) ingredients.push("1-1.5 lbs protein");
      if (n.includes("asada") || n.includes("carne")) ingredients.push("¼ cup fresh lime juice", "3 cloves garlic (minced)", "1 bunch cilantro (chopped)", "1 jalapeño (minced)", "warm tortillas, guacamole, salsa for serving");
      if (n.includes("jerk")) ingredients.push("3 tbsp jerk marinade", "1 lime", "rice and peas for serving");
      break;

    case "kebab":
      if (!pg) ingredients.push("1.5 lbs protein (cubed 1-inch)");
      ingredients.push("1 bell pepper (cut into 1-inch pieces)", "1 red onion (cut into wedges)", "8 wooden or metal skewers");
      if (n.includes("lamb")) ingredients.push("2 tbsp olive oil", "1 tsp cumin", "1 tsp coriander", "½ tsp cinnamon", "2 cloves garlic (minced)", "tzatziki for serving");
      if (n.includes("chicken")) ingredients.push("¼ cup yogurt", "1 tsp paprika", "1 tsp cumin", "juice of 1 lemon");
      if (n.includes("satay")) ingredients.push("¼ cup coconut milk", "2 tbsp soy sauce", "1 tbsp curry powder", "peanut sauce for dipping");
      break;

    case "fried":
      if (n.includes("nugget") || n.includes("tender")) ingredients.push("1 lb chicken breast (cut into strips or nuggets)", "1 cup flour", "2 eggs (beaten)", "1 cup panko breadcrumbs", "oil for frying (about 2 cups)", "½ tsp garlic powder", "½ tsp paprika", "dipping sauces");
      if (n.includes("fish stick")) ingredients.push("1 lb white fish (cut into sticks)", "1 cup flour", "2 eggs (beaten)", "1 cup panko breadcrumbs", "oil for frying", "tartar sauce and lemon");
      if (n.includes("tempura")) ingredients.push("1 lb shrimp + mixed vegetables", "1 cup tempura flour", "1 cup ice-cold sparkling water", "oil for deep frying (350°F)", "soy sauce + grated daikon for dipping");
      if (n.includes("katsu") || n.includes("tonkatsu") || n.includes("schnitzel")) ingredients.push("2 boneless pork chops (pounded to ½ inch)", "½ cup flour", "2 eggs (beaten)", "1 cup panko breadcrumbs", "oil for frying", n.includes("katsu") ? "tonkatsu sauce, shredded cabbage, rice" : "lemon wedge, lingonberry jam");
      if (n.includes("taquito")) ingredients.push("12 corn tortillas", "2 cups shredded cooked chicken", "1 cup shredded cheese", "oil for frying", "sour cream and guacamole for dipping");
      if (n.includes("fries") || n.includes("loaded")) ingredients.push("2 lbs russet potatoes (cut into fries)", "oil for frying", "salt");
      if (n.includes("loaded")) ingredients.push("½ cup shredded cheese", "4 strips bacon (crumbled)", "2 tbsp sour cream", "sliced scallions");
      break;

    case "pizza":
      ingredients.push("1 lb pizza dough (store-bought or homemade)", "½ cup pizza sauce", "2 cups shredded mozzarella", "1 tbsp olive oil");
      if (n.includes("margherita")) ingredients.push("fresh mozzarella (sliced)", "fresh basil leaves");
      if (n.includes("pepperoni")) ingredients.push("3 oz pepperoni slices");
      break;

    case "casserole":
      ingredients.push("cooking spray for dish");
      break;

    case "wrap":
      ingredients.push("2 large flour tortillas (or lettuce leaves for low-carb)");
      break;

    case "flatbread":
      if (n.includes("arepa")) ingredients.push("2 cups pre-cooked white cornmeal (masarepa)", "2½ cups warm water", "1 tsp salt", "1 tbsp oil");
      if (n.includes("paratha") || n.includes("roti")) ingredients.push("2 cups whole wheat flour (atta)", "¾ cup warm water", "2 tbsp ghee", "½ tsp salt");
      if (n.includes("cachapa")) ingredients.push("2 cups fresh corn kernels (or frozen)", "¼ cup cornmeal", "2 tbsp sugar", "1 egg", "queso de mano or mozzarella");
      if (n.includes("pupusa")) ingredients.push("2 cups masa harina", "1½ cups warm water", "1 cup filling (cheese, beans, or pork)", "curtido (pickled cabbage slaw) for serving");
      break;

    case "hash":
      ingredients.push("2 medium potatoes (diced ½ inch)", "½ onion (diced)", "2 tbsp butter or oil");
      if (n.includes("corned beef")) ingredients.push("1 can (12 oz) corned beef (crumbled)", "2 eggs (for topping)");
      else ingredients.push("1 cup diced cooked meat", "2 eggs (for topping)");
      break;

    default:
      // General — use cuisine profile
      ingredients.push(cp.aromatics);
      cp.spices.slice(0, 3).forEach(s => ingredients.push(s));
      break;
  }

  // Add cuisine-specific garnish
  ingredients.push(cp.garnish);

  // Deduplicate
  const seen = new Set<string>();
  return ingredients.filter(i => {
    const key = i.toLowerCase().replace(/[^a-z]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── RECIPE TEXT GENERATORS ─────────────────────────────────────

function generateRecipeText(name: string, cuisine: string, protein: string | null, cookTime: number, dishType: DishType, ingredients: string[]): string {
  const cp = CUISINE_PROFILES[cuisine] || CUISINE_PROFILES.american;
  const pg = protein && protein !== "Plant Based" ? PROTEIN_GUIDES[protein] : (protein === "Plant Based" ? PROTEIN_GUIDES["Plant Based"] : null);

  const lines: string[] = [];
  lines.push("INGREDIENT LIST");
  ingredients.forEach(i => lines.push(`- ${i}`));
  lines.push("");

  // Generate cooking steps based on dish type
  switch (dishType) {
    case "omelette":
      lines.push("PREP FIRST");
      lines.push("1. Crack 3 eggs into a bowl. Add a pinch of salt and 1 tbsp water. Whisk with a fork until just combined — about 20 strokes. Do not overbeat.");
      lines.push("2. Prep all fillings: dice, slice, and measure everything before the pan heats up. Omelettes move fast.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push(`Step 1 — Non-stick skillet: medium-low heat.`);
      lines.push(`Add 1 tbsp butter. Swirl to coat as it foams. When foam subsides (about 30 seconds), pour in eggs.`);
      lines.push(`  - Let eggs sit undisturbed for 30 seconds until edges barely set`);
      lines.push(`  - Using a spatula, gently push edges toward center while tilting pan to let raw egg flow to the edges`);
      lines.push(`  - Repeat 3-4 times until eggs are 80% set but still glossy on top`);
      lines.push("");
      lines.push(`Step 2 — Same pan: reduce to low.`);
      lines.push(`Add fillings to one half of the omelette. Let sit 30 seconds to warm through.`);
      lines.push(`  - Fold the empty half over the fillings`);
      lines.push(`  - Slide onto plate, seam-side down`);
      lines.push(`  - Done when: outside is smooth and pale yellow (not browned), inside is just set but still creamy`);
      break;

    case "scramble":
      lines.push("PREP FIRST");
      lines.push("1. Crack 4 eggs into a bowl. Add a pinch of salt. Whisk gently until just combined.");
      lines.push("2. Prep any add-ins: dice peppers, crumble cheese, chop herbs.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push(`Step 1 — Non-stick skillet: low heat (this is key — low heat = creamy eggs).`);
      lines.push(`Add 1 tbsp butter. Once melted, pour in eggs.`);
      lines.push(`  - Wait 30 seconds. Then push eggs gently from edges to center with a spatula`);
      lines.push(`  - Large, soft curds should form. Do not stir constantly`);
      lines.push(`  - Every 20 seconds, gently fold and push`);
      lines.push("");
      lines.push(`Step 2 — When eggs are 75% set (still look slightly wet):`);
      lines.push(`Add any mix-ins (cheese, vegetables, herbs). Fold through once.`);
      lines.push(`  - Remove from heat immediately — residual heat finishes the cooking`);
      lines.push(`  - Done when: curds are soft, glossy, and barely holding together. If they look "done" in the pan, they're overcooked.`);
      break;

    case "toast":
      lines.push("PREP FIRST");
      lines.push("1. Toast bread until golden and crisp.");
      if (name.toLowerCase().includes("avocado")) {
        lines.push("2. Halve the avocado. Remove pit. Scoop flesh into a bowl. Mash with a fork — leave it slightly chunky.");
        lines.push("3. Season mash with flaky salt, pepper, red pepper flakes, and a squeeze of lemon.");
      }
      if (name.toLowerCase().includes("poach") || name.toLowerCase().includes("egg")) {
        lines.push("4. For poached eggs: bring 3 inches of water to a gentle simmer (tiny bubbles, NOT a rolling boil). Add 1 tbsp vinegar.");
        lines.push("   Create a gentle whirlpool with a spoon. Crack egg into the center. Cook 3 minutes for runny yolk. Remove with slotted spoon.");
      }
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Assemble immediately while toast is hot.");
      lines.push("Spread toppings evenly. Layer with care — this is as much about texture contrast as flavor.");
      lines.push("  - Done when: toast is still warm and crispy underneath, toppings are room temperature or just warm");
      break;

    case "pancake":
      lines.push("PREP FIRST");
      lines.push("1. In a large bowl, whisk together flour, sugar, baking powder, and salt.");
      lines.push("2. In a separate bowl, whisk milk, egg, and melted butter.");
      lines.push("3. Pour wet into dry. Stir ONLY until just combined — lumps are good. Overmixing = tough pancakes.");
      if (name.toLowerCase().includes("banana")) lines.push("4. Fold in mashed bananas gently.");
      if (name.toLowerCase().includes("blueberry")) lines.push("4. Fold in blueberries gently — don't crush them.");
      if (name.toLowerCase().includes("chocolate")) lines.push("4. Fold in chocolate chips.");
      lines.push("5. Let batter rest 5 minutes while griddle heats.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push(`Step 1 — Griddle or large non-stick pan: medium heat. Lightly butter the surface.`);
      lines.push(`Pour ¼ cup batter per pancake. Do not spread — let gravity do it.`);
      lines.push(`  - Cook until bubbles form across the entire surface AND the edges look set (about 2-3 minutes)`);
      lines.push(`  - Flip ONCE. Cook 1-2 more minutes until golden underneath.`);
      lines.push(`  - Done when: golden brown on both sides, springs back when gently pressed in center`);
      lines.push("");
      lines.push(`Step 2 — Keep finished pancakes warm in a 200°F oven on a wire rack while you cook the rest.`);
      lines.push(`Serve stacked with butter and warm maple syrup.`);
      break;

    case "waffle":
      lines.push("PREP FIRST");
      lines.push("1. Separate eggs. Whites in one bowl, yolks in another.");
      lines.push("2. Whisk flour, sugar, baking powder, and salt in a large bowl.");
      lines.push("3. Add yolks, milk, melted butter, and vanilla to the dry ingredients. Mix until smooth.");
      lines.push("4. Beat egg whites with a hand mixer until stiff peaks form. Fold gently into batter — this is the secret to crispy waffles.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Preheat waffle iron to medium-high. Spray with cooking spray.");
      lines.push("Pour batter to fill ¾ of the iron. Close lid.");
      lines.push("  - Cook until steam stops coming out (about 4-5 minutes)");
      lines.push("  - Do NOT open early or the waffle will tear");
      lines.push("  - Done when: deep golden brown, crispy outside, fluffy inside");
      break;

    case "oatmeal":
      lines.push("PREP FIRST");
      lines.push("1. Measure oats and liquid. Prep your toppings.");
      if (name.toLowerCase().includes("overnight") || name.toLowerCase().includes("bircher")) {
        lines.push("");
        lines.push("COOKING STEPS (no cooking needed)");
        lines.push("Step 1 — Combine oats, milk, and a pinch of salt in a jar or bowl.");
        lines.push("  - Stir in yogurt, chia seeds, or honey as desired");
        lines.push("  - Cover and refrigerate overnight (at least 6 hours)");
        lines.push("Step 2 — In the morning, stir. Add toppings: fresh fruit, nuts, honey.");
        lines.push("  - Eat cold or microwave 1-2 minutes if you prefer warm");
      } else {
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push("Step 1 — Saucepan: medium heat. Bring water (or milk) and salt to a gentle simmer.");
        lines.push("Add oats. Stir once. Reduce heat to medium-low.");
        lines.push("  - Cook 5 minutes, stirring occasionally");
        lines.push("  - Oats should be creamy and thick, not gluey");
        lines.push("Step 2 — Remove from heat. Stir in toppings and sweetener.");
        lines.push("  - Let sit 1 minute — oats thicken as they rest");
      }
      break;

    case "smoothie":
      lines.push("PREP FIRST");
      lines.push("1. Gather all ingredients. If using fresh fruit, freeze it first for best texture.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Add liquids to blender first (milk, yogurt), then frozen items on top.");
      lines.push("Blend on high 30-60 seconds until perfectly smooth.");
      if (name.toLowerCase().includes("acai")) {
        lines.push("Step 2 — Pour into a bowl (should be thick enough to eat with a spoon).");
        lines.push("Top with granola, sliced banana, berries, coconut flakes, and a drizzle of honey.");
        lines.push("  - Eat immediately — acai melts fast");
      }
      break;

    case "pudding":
      lines.push("PREP FIRST");
      lines.push("1. Combine chia seeds, milk, sweetener, and vanilla in a jar. Stir vigorously for 2 minutes.");
      lines.push("2. Let sit 5 minutes, then stir again (prevents clumping).");
      lines.push("3. Cover and refrigerate at least 4 hours, ideally overnight.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Stir the set pudding. It should be thick and gel-like.");
      lines.push("Layer in a glass: pudding, fresh fruit, a drizzle of honey.");
      break;

    case "french_toast":
      lines.push("PREP FIRST");
      lines.push("1. Whisk eggs, milk, vanilla, and cinnamon in a shallow dish.");
      lines.push("2. Slice bread into thick slices (¾ inch). Stale bread works better — it absorbs without falling apart.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Large skillet or griddle: medium heat. Melt 1 tbsp butter.");
      lines.push("Dip each bread slice in egg mixture — 15 seconds per side. Let excess drip off.");
      lines.push("  - Place in pan. Cook 2-3 minutes until deep golden brown");
      lines.push("  - Flip ONCE. Cook 2 more minutes");
      lines.push("  - Done when: golden brown, slightly crispy outside, custardy inside");
      lines.push("Step 2 — Serve immediately with maple syrup, powdered sugar, and fresh berries.");
      break;

    case "benedict":
      lines.push("PREP FIRST");
      lines.push("1. Start hollandaise: in a small saucepan, melt ½ cup butter until just bubbling. Set aside.");
      lines.push("2. In a blender or bowl: combine 3 egg yolks and 1 tbsp lemon juice. Blend/whisk.");
      lines.push("3. Slowly drizzle in melted butter while blending/whisking continuously until thick and creamy. Add pinch of cayenne. Keep warm.");
      lines.push("4. Toast English muffins. Warm the Canadian bacon in a pan.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Poach eggs: bring 3 inches of water to a gentle simmer. Add 1 tbsp vinegar.");
      lines.push("Create a whirlpool. Crack egg into center. Cook exactly 3 minutes for runny yolk.");
      lines.push("  - Remove with slotted spoon. Drain on paper towel.");
      lines.push("Step 2 — Assemble: toasted muffin → Canadian bacon → poached egg → generous spoonful of hollandaise.");
      lines.push("  - Sprinkle with a pinch of paprika and chopped chives");
      lines.push("  - Serve immediately — hollandaise waits for no one");
      break;

    case "frittata":
      lines.push("PREP FIRST");
      lines.push("1. Preheat oven to 375°F.");
      lines.push("2. Whisk eggs with milk, salt, and pepper until just combined.");
      lines.push("3. Prep all fillings — dice vegetables, crumble cheese, chop herbs.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Oven-safe skillet: medium heat. Add oil.");
      lines.push("Sauté vegetables 3-4 minutes until just tender.");
      lines.push("Step 2 — Pour egg mixture over vegetables. Do not stir.");
      lines.push("  - Cook on stovetop 2 minutes until edges begin to set");
      lines.push("  - Sprinkle cheese on top");
      lines.push("  - Transfer to oven. Bake 12-15 minutes");
      lines.push("  - Done when: center is set (doesn't jiggle) and top is lightly golden");
      lines.push("  - Let cool 5 minutes in pan before slicing into wedges");
      break;

    case "tacos":
      lines.push("PREP FIRST");
      generateProteinPrepSteps(lines, pg, name, cuisine, cp);
      lines.push("");
      lines.push("COOKING STEPS");
      generateProteinCookSteps(lines, pg, name, cp, "1");
      lines.push("");
      lines.push(`Step 2 — Warm tortillas: place directly on a gas burner flame (or dry skillet) for 15-20 seconds per side until lightly charred and pliable.`);
      lines.push(`Wrap in a clean towel to keep warm.`);
      lines.push("");
      lines.push(`Step 3 — Assemble: fill each tortilla with protein. Top with diced onion, cilantro, a squeeze of lime, and salsa.`);
      lines.push(`  - Serve immediately with extra lime wedges on the side`);
      break;

    case "burrito":
      lines.push("PREP FIRST");
      generateProteinPrepSteps(lines, pg, name, cuisine, cp);
      lines.push("");
      lines.push("COOKING STEPS");
      generateProteinCookSteps(lines, pg, name, cp, "1");
      lines.push("");
      lines.push("Step 2 — Warm tortilla in a dry skillet 15 seconds per side until pliable.");
      lines.push("Lay flat. Layer: rice, beans, protein, cheese, sour cream, salsa down the center.");
      lines.push("  - Fold bottom edge up over filling, then fold sides in, then roll tightly");
      lines.push("  - Optional: place seam-side down on hot skillet 1 minute to seal and crisp");
      break;

    case "quesadilla":
      lines.push("PREP FIRST");
      lines.push("1. Shred cheese. Prep any fillings (slice, dice, cook if needed).");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Large skillet: medium heat. No oil needed.");
      lines.push("Place tortilla flat in pan. Spread cheese evenly over entire surface.");
      lines.push("  - Add fillings over half the tortilla");
      lines.push("  - Cook 2-3 minutes until bottom is golden and cheese starts melting");
      lines.push("  - Fold in half and press gently with spatula");
      lines.push("  - Flip and cook 1-2 more minutes");
      lines.push("  - Done when: both sides golden and crispy, cheese fully melted inside");
      lines.push("Step 2 — Let rest 1 minute. Cut into triangles. Serve with sour cream, guacamole, and salsa.");
      break;

    case "curry":
      lines.push("PREP FIRST");
      generateProteinPrepSteps(lines, pg, name, cuisine, cp);
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push(`Step 1 — Heavy-bottomed pot: medium heat. Add ${cp.oil}.`);
      if (cuisine === "south_asian") {
        lines.push(`Add cumin seeds — wait until they crackle and pop (10-15 seconds).`);
        lines.push(`Add ${cp.aromatics}. Sauté 5-6 minutes until onions are deep golden (not just soft — golden = flavor).`);
      } else {
        lines.push(`Add ${cp.aromatics}. Sauté 2-3 minutes until fragrant.`);
      }
      lines.push(`Add spices: ${cp.spices.join(", ")}. Stir constantly 30 seconds until fragrant (do not burn).`);
      lines.push("");
      if (pg && protein !== "Plant Based") {
        lines.push(`Step 2 — Add protein. Sear on all sides 2-3 minutes.`);
        lines.push(`Add tomatoes and coconut milk. Stir to combine.`);
      } else {
        lines.push(`Step 2 — Add main ingredients. Stir to coat with spices.`);
        lines.push(`Add liquid (coconut milk, tomatoes, or broth).`);
      }
      lines.push(`  - Bring to a simmer. Reduce heat to low. Cover.`);
      lines.push(`  - Cook ${cookTime > 30 ? "25-30" : "15-20"} minutes, stirring occasionally`);
      lines.push(`  - Done when: sauce is thickened, protein is cooked through, flavors are melded`);
      lines.push("");
      lines.push(`Step 3 — Taste and adjust: more salt? More acid (lime/lemon)? A pinch of sugar to balance?`);
      lines.push(`Serve over ${cp.starchBase}. Garnish with ${cp.garnish}.`);
      break;

    case "soup":
      lines.push("PREP FIRST");
      lines.push("1. Dice all vegetables uniformly (same size = even cooking).");
      if (pg) lines.push(`2. ${pg.prep}`);
      lines.push("");
      lines.push("COOKING STEPS");
      if (name.toLowerCase().includes("pho")) {
        lines.push("Step 1 — Large pot: char onion and ginger directly over gas flame (or under broiler) until blackened. This is essential for flavor.");
        lines.push("Step 2 — Add charred aromatics to 8 cups beef broth with star anise, cinnamon stick, and fish sauce. Simmer 30 minutes. Strain.");
        lines.push("Step 3 — Cook rice noodles according to package. Divide into bowls.");
        lines.push("Step 4 — Bring broth to a rolling boil. Ladle over noodles and raw sliced beef — the boiling broth cooks the beef instantly.");
        lines.push("  - Serve with plate of: bean sprouts, Thai basil, lime wedges, hoisin sauce, sriracha");
      } else if (name.toLowerCase().includes("ramen")) {
        lines.push("Step 1 — Bring 6 cups broth to a simmer. Whisk in miso paste and soy sauce.");
        lines.push("Step 2 — Cook noodles separately per package directions. Drain.");
        lines.push("Step 3 — Divide noodles into bowls. Ladle hot broth over noodles.");
        lines.push("Step 4 — Top with: halved soft-boiled egg, sliced pork, nori, scallions, a drizzle of sesame oil.");
        lines.push("  - For soft-boiled eggs: lower into boiling water, cook exactly 6.5 minutes, shock in ice bath");
      } else {
        lines.push(`Step 1 — Large pot: medium heat. Add ${cp.oil}. Sauté ${cp.aromatics} for 4-5 minutes until softened.`);
        lines.push(`Add spices and cook 1 minute until fragrant.`);
        lines.push("");
        lines.push(`Step 2 — Add broth and main ingredients. Bring to a boil, then reduce to a simmer.`);
        lines.push(`  - Cover and cook 20-25 minutes until everything is tender`);
        lines.push(`  - Season to taste: salt, pepper, acid (lemon juice or vinegar)`);
      }
      break;

    case "stew":
      lines.push("PREP FIRST");
      if (name.toLowerCase().includes("shakshuka")) {
        lines.push("1. Dice onion, mince garlic, slice bell pepper.");
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push("Step 1 — Large oven-safe skillet: medium heat. Add 2 tbsp olive oil.");
        lines.push("Sauté onion and pepper 5 minutes until soft. Add garlic, cumin, paprika, cayenne. Stir 30 seconds.");
        lines.push("Step 2 — Pour in crushed tomatoes. Simmer 10 minutes until thickened slightly.");
        lines.push("Step 3 — Make 4 wells in the sauce with a spoon. Crack an egg into each well.");
        lines.push("  - Cover. Cook 5-7 minutes until whites are set but yolks are still runny");
        lines.push("  - Crumble feta on top. Scatter cilantro. Serve straight from the skillet with crusty bread for dipping.");
      } else {
        lines.push("1. Cut all ingredients into bite-sized pieces.");
        if (pg) lines.push(`2. ${pg.prep}`);
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push(`Step 1 — Heavy pot (Dutch oven): medium-high heat. Add ${cp.oil}.`);
        if (pg) {
          lines.push(`Brown protein in batches — do not crowd. 3-4 minutes per batch. Remove and set aside.`);
        }
        lines.push(`Step 2 — Same pot: add ${cp.aromatics}. Sauté 5 minutes. Add spices.`);
        lines.push(`Add liquid. Return protein. Bring to a simmer.`);
        lines.push(`  - Reduce heat to low. Cover. Cook ${cookTime > 30 ? "45 minutes to 1 hour" : "25-30 minutes"}`);
        lines.push(`  - Stir occasionally. Add more liquid if needed.`);
        lines.push(`  - Done when: meat is fork-tender, sauce is thick and glossy`);
      }
      break;

    case "stir_fry":
      lines.push("PREP FIRST");
      lines.push("1. This is the MOST IMPORTANT part of a stir fry: everything must be prepped before the wok gets hot. Once you start cooking, it moves in 60-second bursts.");
      if (pg) lines.push(`2. ${pg.prep} Cut into thin, bite-sized strips.`);
      lines.push("3. Cut all vegetables into similar-sized pieces so they cook evenly.");
      lines.push("4. Mix sauce ingredients in a small bowl: soy sauce, oyster sauce, cornstarch slurry.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push(`Step 1 — Wok (or large skillet): high heat. Add ${cp.oil}. Wait until oil shimmers and a drop of water sizzles on contact.`);
      if (pg) {
        lines.push(`Add protein in a single layer. Do NOT stir for 60 seconds — let it sear.`);
        lines.push(`Flip and cook 60 more seconds. Remove to a plate.`);
      }
      lines.push("");
      lines.push(`Step 2 — Same wok, still high heat. Add a splash more oil.`);
      lines.push(`Add hard vegetables first (carrots, broccoli stems) — cook 1 minute.`);
      lines.push(`Add softer vegetables (snap peas, bell peppers, leafy greens) — cook 1 minute more.`);
      lines.push(`  - Vegetables should be crisp-tender, bright in color, NOT limp`);
      lines.push("");
      lines.push(`Step 3 — Return protein to wok. Pour sauce around the edges (not directly on food — the wok caramelizes it).`);
      lines.push(`Toss everything together 30 seconds.`);
      lines.push(`Add ${cp.aromatics.split(",")[1] || "garlic and ginger"}. Toss 15 more seconds.`);
      lines.push(`Serve immediately over ${cp.starchBase}. Garnish with ${cp.garnish}.`);
      break;

    case "fried_rice":
      lines.push("PREP FIRST");
      lines.push("1. The #1 secret: use DAY-OLD cold rice. Fresh rice = mushy fried rice. Spread leftover rice on a sheet pan in the fridge if needed.");
      lines.push("2. Dice all add-ins small. Beat eggs in a separate bowl.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push(`Step 1 — Wok or large skillet: high heat. Add 1 tbsp oil.`);
      lines.push(`Pour in beaten eggs. Scramble quickly into small pieces (30 seconds). Remove to plate.`);
      lines.push("");
      lines.push(`Step 2 — Same wok, high heat. Add 1 tbsp oil. Add protein and cook until heated through (2 minutes). Push to side.`);
      lines.push(`Add vegetables. Cook 1-2 minutes.`);
      lines.push("");
      lines.push(`Step 3 — Add cold rice to wok. Press flat against the hot surface — let it sizzle and get slightly crispy (1 minute).`);
      lines.push(`Toss. Repeat. This is how you get wok hei (breath of the wok).`);
      lines.push(`  - Add soy sauce around the edges of the wok (not on the rice directly)`);
      lines.push(`  - Return scrambled egg. Toss everything together.`);
      lines.push(`  - Finish with sesame oil. Garnish with ${cp.garnish}.`);
      break;

    case "pasta":
      lines.push("PREP FIRST");
      lines.push("1. Bring a large pot of water to a rolling boil. Add salt — it should taste like the sea (about 2 tbsp per gallon).");
      lines.push("2. This water is your secret weapon. Reserve 1 cup before draining — pasta water = liquid gold for sauces.");
      lines.push("3. Prep all sauce ingredients while water heats.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Cook pasta 1 minute LESS than package directions (it finishes in the sauce).");

      if (name.toLowerCase().includes("aglio")) {
        lines.push("Step 2 — While pasta cooks: large skillet, medium-low heat. Add ¼ cup olive oil.");
        lines.push("Add sliced garlic. Cook SLOWLY 3-4 minutes, swirling pan — golden, not brown. The moment it turns golden, add red pepper flakes and remove from heat.");
        lines.push("Step 3 — Transfer pasta directly to the skillet (tongs work great). Add ½ cup pasta water.");
        lines.push("Toss vigorously over medium heat. The starch + oil + water creates a silky emulsion.");
        lines.push("  - Add more pasta water if needed — sauce should coat each strand");
      } else if (name.toLowerCase().includes("carbonara")) {
        lines.push("Step 2 — While pasta cooks: dice guanciale/pancetta. Cook in cold skillet over medium heat until fat renders and meat is crispy (6-7 minutes). Remove from heat.");
        lines.push("Step 3 — In a bowl, whisk egg yolks, whole egg, and Pecorino until creamy.");
        lines.push("Step 4 — With pan OFF heat: add drained pasta to the pork fat. Toss. Add egg mixture and ½ cup pasta water. Toss rapidly — the residual heat gently cooks the eggs into a creamy sauce.");
        lines.push("  - If it looks dry, add more pasta water. If it's runny, toss a bit more.");
        lines.push("  - CRITICAL: do this OFF heat. Direct heat = scrambled eggs, not carbonara.");
      } else if (name.toLowerCase().includes("cacio")) {
        lines.push("Step 2 — In a bowl, mix finely grated Pecorino with freshly cracked black pepper.");
        lines.push("Step 3 — Transfer pasta to a warm bowl with ½ cup pasta water. Add the Pecorino mixture.");
        lines.push("Toss rapidly and aggressively — the starch water + cheese creates the creamy sauce.");
        lines.push("  - Add more pasta water as needed until silky and coating every strand");
      } else if (name.toLowerCase().includes("pesto")) {
        lines.push("Step 2 — Make pesto: blend basil, pine nuts, garlic, and Parmesan in a food processor. Stream in olive oil while running. Season with salt.");
        lines.push("Step 3 — Toss hot pasta with pesto and 3-4 tbsp pasta water until glossy and evenly coated.");
      } else if (name.toLowerCase().includes("bolognese") || name.toLowerCase().includes("meatball") || name.toLowerCase().includes("spaghetti")) {
        lines.push("Step 2 — While pasta cooks: large skillet, medium-high heat. Brown ground beef 5-6 minutes, breaking into small pieces.");
        lines.push("Add aromatics (onion, carrot, celery) and cook 5 minutes. Add tomato paste, cook 1 minute.");
        lines.push("Add tomatoes. Simmer 15-20 minutes until thick.");
        if (name.toLowerCase().includes("meatball")) {
          lines.push("  - For meatballs: mix ground beef with breadcrumbs, egg, Parmesan, garlic. Form 1.5-inch balls. Brown all sides in a skillet, then simmer in sauce 15 minutes.");
        }
        lines.push("Step 3 — Add pasta directly to sauce with a splash of pasta water. Toss to coat. Top with fresh basil and Parmesan.");
      } else if (name.toLowerCase().includes("mac") && name.toLowerCase().includes("cheese")) {
        lines.push("Step 2 — Melt butter in saucepan over medium heat. Whisk in flour — cook 1 minute (this is your roux).");
        lines.push("Slowly add milk while whisking constantly. Cook 5-7 minutes until thickened enough to coat the back of a spoon.");
        lines.push("Remove from heat. Stir in shredded cheese, mustard powder, and salt until smooth and glossy.");
        lines.push("Step 3 — Add cooked pasta to cheese sauce. Stir to coat every piece.");
        lines.push("  - Optional: transfer to baking dish, top with breadcrumbs, broil 3-4 minutes until golden and bubbly");
      } else if (name.toLowerCase().includes("alfredo") || name.toLowerCase().includes("fettuccine")) {
        lines.push("Step 2 — In a large skillet: melt butter over medium heat. Add minced garlic, cook 30 seconds.");
        lines.push("Pour in heavy cream. Simmer 3-4 minutes until slightly reduced.");
        lines.push("Step 3 — Add pasta with ½ cup pasta water. Toss. Add Parmesan in 3 additions, tossing between each.");
        lines.push("  - The sauce should be silky and cling to the pasta — add more pasta water if too thick.");
      } else {
        lines.push(`Step 2 — While pasta cooks, prepare sauce with ${cp.oil} and aromatics.`);
        lines.push("Step 3 — Combine pasta and sauce with a splash of pasta water. Toss until everything is coated and glossy.");
      }
      lines.push(`Garnish with ${cp.garnish}. Serve immediately — pasta waits for no one.`);
      break;

    case "noodles":
      lines.push("PREP FIRST");
      if (name.toLowerCase().includes("pad thai")) {
        lines.push("1. Soak flat rice noodles in warm (not hot) water for 20 minutes. They should be pliable but still firm. Drain.");
        lines.push("2. Mix sauce: tamarind paste, fish sauce, and sugar in a small bowl.");
        lines.push("3. Prep: slice scallions into 2-inch pieces, mince garlic, beat eggs.");
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push("Step 1 — Wok: high heat. Add oil. Cook shrimp (or chicken) 2 minutes per side. Remove.");
        lines.push("Step 2 — Same wok: add a splash more oil. Push beaten eggs around the wok until just set (30 seconds). Break into pieces.");
        lines.push("Step 3 — Add drained noodles and sauce. Toss with tongs 1-2 minutes until noodles absorb the sauce and soften.");
        lines.push("Return protein. Add bean sprouts and scallions. Toss 30 seconds.");
        lines.push("  - Plate immediately. Top with crushed peanuts, lime wedge, extra bean sprouts.");
      } else if (name.toLowerCase().includes("dan dan")) {
        lines.push("1. Cook noodles per package directions. Drain and rinse.");
        lines.push("2. Mix sauce: chili oil, soy sauce, vinegar, sesame paste, sugar.");
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push("Step 1 — Skillet: medium-high heat. Cook ground pork 4-5 minutes until crispy and brown, breaking into small pieces.");
        lines.push("Add Sichuan peppercorns. Cook 30 seconds until fragrant.");
        lines.push("Step 2 — Divide noodles into bowls. Spoon sauce over noodles. Top with crispy pork.");
        lines.push("  - Toss everything together at the table. The sauce should coat every strand.");
      } else {
        lines.push("1. Prepare noodles per package directions. Prep vegetables and sauce.");
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push(`Step 1 — Wok: high heat. Add ${cp.oil}. Cook protein 2-3 minutes. Remove.`);
        lines.push("Step 2 — Stir-fry vegetables 2 minutes. Add noodles and sauce. Toss with tongs until evenly coated.");
        lines.push("Return protein. Toss 30 seconds. Serve immediately.");
      }
      break;

    case "salad":
      lines.push("PREP FIRST");
      lines.push("1. Wash and dry all greens thoroughly (wet greens = diluted dressing).");
      lines.push("2. Prep all vegetables: slice, dice, or shave as specified.");
      if (pg) lines.push(`3. ${pg.prep}`);
      lines.push("");
      lines.push("COOKING STEPS");
      if (pg && protein !== "Plant Based") {
        lines.push(`Step 1 — ${pg.cookMethod}`);
        lines.push(`  - ${pg.doneCue}`);
        lines.push("  - Let protein cool slightly (warm protein on cold greens = wilting).");
        lines.push("");
      }
      lines.push(`Step ${pg ? "2" : "1"} — Make the dressing: whisk together ${cp.sauces.join(", ")}, and ${cp.oil} until emulsified.`);
      lines.push(`Step ${pg ? "3" : "2"} — Toss greens with HALF the dressing first. Taste. Add more if needed.`);
      lines.push(`Arrange protein and toppings. Drizzle remaining dressing. Garnish with ${cp.garnish}.`);
      break;

    case "rice_dish":
      lines.push("PREP FIRST");
      lines.push("1. Rinse rice in cold water until water runs clear (3-4 rinses). This removes excess starch for fluffy, separate grains.");
      if (pg) lines.push(`2. ${pg.prep}`);
      lines.push("");
      lines.push("COOKING STEPS");
      if (name.toLowerCase().includes("risotto")) {
        lines.push("Step 1 — Keep broth warm in a separate pot (cold broth + hot rice = temperature shock).");
        lines.push("Step 2 — Wide pan: medium heat. Toast Arborio rice in butter 2 minutes until edges become translucent.");
        lines.push("Add wine. Stir until absorbed.");
        lines.push("Step 3 — Add warm broth one ladle at a time. Stir frequently (not constantly). Wait until each addition is mostly absorbed before adding the next.");
        lines.push("  - This takes 18-20 minutes. Be patient.");
        lines.push("  - Done when: rice is creamy and al dente — still has a slight bite in the center");
        lines.push("Step 4 — Remove from heat. Stir in Parmesan and butter (this is called 'mantecatura'). Cover 2 minutes. Serve immediately — risotto waits for no one.");
      } else if (name.toLowerCase().includes("biryani")) {
        lines.push("Step 1 — Marinate protein in yogurt and spices for at least 30 minutes (longer = better, up to overnight).");
        lines.push("Step 2 — Par-cook rice: boil rice in salted water until 70% done (still has a hard center). Drain.");
        lines.push("Step 3 — Heavy pot: layer marinated protein on bottom, then par-cooked rice, then fried onions, saffron milk, and fresh herbs.");
        lines.push("Step 4 — Seal lid with foil or dough. Cook on lowest heat 25-30 minutes (dum cooking).");
        lines.push("  - Do NOT open the lid. The steam is doing the work.");
        lines.push("  - Done when: rice is fully cooked, fragrant, each grain separate. Serve with raita.");
      } else if (name.toLowerCase().includes("paella")) {
        lines.push("Step 1 — Wide pan (paella pan or large skillet): medium-high heat. Brown chorizo 3 minutes. Add seafood and sear 2 minutes. Remove everything.");
        lines.push("Step 2 — Same pan: sauté onion and garlic 3 minutes. Add tomatoes and saffron. Cook 2 minutes.");
        lines.push("Step 3 — Add rice. Stir to coat with oil and tomato. Add broth. Bring to a boil.");
        lines.push("  - DO NOT STIR from this point. Reduce to medium-low. Cook 18-20 minutes.");
        lines.push("  - The bottom should develop socarrat (crispy rice layer) — listen for a faint crackling");
        lines.push("Step 4 — Nestle seafood and chorizo into the rice for last 5 minutes. Cover with foil.");
        lines.push("  - Rest 5 minutes. Serve with lemon wedges.");
      } else {
        lines.push(`Step 1 — Large pot: medium heat. Add ${cp.oil}. Sauté ${cp.aromatics} 4-5 minutes.`);
        lines.push(`Add spices. Stir 1 minute until fragrant.`);
        lines.push(`Step 2 — Add rice. Stir to coat every grain with oil and spices (1-2 minutes). This toasts the rice.`);
        lines.push(`Add broth (ratio: 1 cup rice to 1.5-2 cups liquid). Bring to a boil.`);
        lines.push(`  - Reduce to lowest heat. Cover tightly. Cook 18 minutes.`);
        lines.push(`  - Do NOT lift the lid.`);
        lines.push(`  - Remove from heat. Let steam 5 minutes with lid on.`);
        lines.push(`  - Fluff with a fork.`);
      }
      break;

    case "grilled":
      lines.push("PREP FIRST");
      if (pg) lines.push(`1. ${pg.prep}`);
      if (name.toLowerCase().includes("asada") || name.toLowerCase().includes("carne")) {
        lines.push("2. Make marinade: mix lime juice, garlic, cilantro, jalapeño, and oil. Pour over meat. Marinate at least 1 hour (up to 8 hours).");
      }
      lines.push("3. Preheat grill to high heat. Clean and oil the grates.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Remove protein from marinade. Let excess drip off. Pat surface dry for better sear.");
      if (pg) {
        lines.push(`${pg.cookMethod}`);
        lines.push(`  - ${pg.doneCue}`);
      }
      lines.push("  - Let rest 5-8 minutes before slicing (rest = juicy, skip = dry)");
      lines.push(`Step 2 — Slice against the grain. Serve with ${cp.garnish} and ${cp.starchBase}.`);
      break;

    case "kebab":
      lines.push("PREP FIRST");
      lines.push("1. If using wooden skewers, soak in water 30 minutes (prevents burning).");
      if (pg) lines.push(`2. ${pg.prep} Cut into 1-inch cubes.`);
      lines.push("3. Prepare marinade. Toss protein cubes in marinade. Refrigerate 30 minutes to 2 hours.");
      lines.push("4. Cut vegetables into pieces similar in size to the protein.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Thread skewers: alternate protein and vegetables. Leave small gaps between pieces for even cooking.");
      lines.push("Step 2 — Grill (or broiler): high heat. Cook 3-4 minutes per side, rotating to cook all 4 sides evenly.");
      lines.push("  - Baste with remaining marinade while cooking");
      lines.push(`  - Done when: ${pg ? pg.doneCue : "protein is cooked through and vegetables are charred at edges"}`);
      lines.push("Step 3 — Rest 3 minutes. Serve on or off skewers with sauce and flatbread.");
      break;

    case "fried":
      lines.push("PREP FIRST");
      lines.push("1. Set up a breading station: plate of flour → bowl of beaten eggs → plate of breadcrumbs/panko. Season each with salt and pepper.");
      if (pg) lines.push(`2. ${pg.prep}`);
      lines.push("3. Line a plate with paper towels for draining.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Dredge: flour first (shake off excess) → egg wash (let excess drip) → breadcrumbs (press firmly).");
      lines.push("  - Place breaded items on a wire rack. Let sit 5 minutes — this helps coating adhere during frying.");
      lines.push("Step 2 — Heavy pot or deep skillet: fill with oil to 1.5 inches depth. Heat to 350°F (use a thermometer — guessing = inconsistent results).");
      lines.push("  - Test with a breadcrumb: it should sizzle immediately and float");
      lines.push("  - Add items in batches — do NOT crowd the pan (temperature drops = greasy food)");
      lines.push("  - Fry 3-4 minutes per side until deep golden brown and crispy");
      lines.push("Step 3 — Transfer to paper towels. Season with salt IMMEDIATELY while hot (it sticks better).");
      lines.push("  - Let oil return to 350°F between batches");
      break;

    case "bowl":
      lines.push("PREP FIRST");
      lines.push("1. Cook the grain base: rice, quinoa, or noodles per package directions.");
      if (pg) lines.push(`2. ${pg.prep}`);
      lines.push("3. Prepare all toppings — a good bowl has 4-5 distinct components with different textures.");
      lines.push("");
      lines.push("COOKING STEPS");
      if (pg) {
        lines.push(`Step 1 — Cook protein: ${pg.cookMethod}`);
        lines.push(`  - ${pg.doneCue}`);
        lines.push("  - Slice or break into bite-sized pieces.");
        lines.push("");
      }
      lines.push(`Step ${pg ? "2" : "1"} — Assemble: start with a base of ${cp.starchBase}.`);
      lines.push("Arrange protein and toppings in sections around the bowl (not mixed — you eat it by combining bites).");
      lines.push(`Drizzle with ${cp.sauces[0]}. Garnish with ${cp.garnish}.`);
      break;

    case "sandwich":
      lines.push("PREP FIRST");
      if (pg) lines.push(`1. ${pg.prep}`);
      lines.push("2. Prepare all toppings and condiments. Toast bread if specified.");
      lines.push("");
      lines.push("COOKING STEPS");
      if (pg) {
        lines.push(`Step 1 — ${pg.cookMethod}`);
        lines.push(`  - ${pg.doneCue}`);
        lines.push("");
      }
      if (name.toLowerCase().includes("grilled cheese")) {
        lines.push("Step 1 — Butter the OUTSIDE of each bread slice (not the inside).");
        lines.push("Place one slice butter-side down in a cold skillet. Add cheese. Top with second slice, butter-side up.");
        lines.push("Turn heat to medium-low. Cook 3-4 minutes until golden. Flip. Cook 2-3 more minutes.");
        lines.push("  - Done when: bread is golden and crispy, cheese is fully melted and stretchy");
        lines.push("  - Low heat is the secret — rush it and you get burnt bread with cold cheese");
      } else if (name.toLowerCase().includes("burger")) {
        lines.push("Step 1 — Form patties: divide meat into portions. Form into balls, then flatten to ¾ inch thick. Make a thumbprint indent in the center (prevents puffing).");
        lines.push("Season GENEROUSLY with salt and pepper on both sides.");
        lines.push("Step 2 — Cast iron skillet or grill: high heat. Cook 3-4 minutes per side for medium.");
        lines.push("Add cheese in the last minute. Cover to melt.");
        lines.push("Step 3 — Toast buns in the rendered beef fat. Assemble: bottom bun → sauce → patty → toppings → top bun.");
      } else {
        lines.push(`Step ${pg ? "2" : "1"} — Layer ingredients on bread: spread condiments first, then protein, then toppings.`);
        lines.push("Cut diagonally. Serve immediately.");
      }
      break;

    case "flatbread":
      if (name.toLowerCase().includes("arepa")) {
        lines.push("PREP FIRST");
        lines.push("1. Mix masarepa, warm water, and salt until a soft dough forms. It should feel like play-doh — not sticky, not crumbly.");
        lines.push("2. Let rest 5 minutes. Divide into 4-6 balls. Flatten into discs about ½ inch thick.");
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push("Step 1 — Skillet: medium heat. Add oil. Cook arepas 5-6 minutes per side until a golden crust forms and they sound hollow when tapped.");
        lines.push("  - Optional: finish in a 350°F oven for 10 minutes to cook through completely");
        lines.push("Step 2 — Split open like a pocket. Fill with cheese, beans, protein, avocado.");
      } else if (name.toLowerCase().includes("paratha")) {
        lines.push("PREP FIRST");
        lines.push("1. Mix flour, salt, and water into a soft, smooth dough. Knead 5 minutes. Rest covered 20 minutes.");
        lines.push("2. Divide into 4 balls. Roll each thin, brush with ghee, fold into thirds, roll again (this creates flaky layers).");
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push("Step 1 — Flat griddle (tawa) or skillet: medium-high heat.");
        lines.push("Place paratha. Cook 1-2 minutes until bubbles appear. Flip.");
        lines.push("Brush top with ghee. Cook 1 minute. Flip again. Press edges with spatula — it should puff up.");
        lines.push("  - Done when: golden brown spots on both sides, flaky and layered when torn");
      } else {
        lines.push("PREP FIRST");
        lines.push("1. Prepare dough per recipe. Let rest 15-20 minutes.");
        lines.push("");
        lines.push("COOKING STEPS");
        lines.push("Step 1 — Hot griddle or skillet. Cook flatbread 2-3 minutes per side until puffed and spotted.");
      }
      break;

    case "hash":
      lines.push("PREP FIRST");
      lines.push("1. Dice potatoes into ½-inch cubes (small = crispy). Dice onion to match.");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Large cast iron skillet: medium-high heat. Add butter/oil.");
      lines.push("Add potatoes in a single layer. Do NOT stir for 4-5 minutes — let them develop a golden crust.");
      lines.push("Flip sections. Add onion. Cook 4-5 more minutes until potatoes are golden and crispy all over.");
      lines.push("Step 2 — Add meat. Mix in. Season with salt and pepper.");
      lines.push("Make 2 wells. Crack an egg into each. Cover and cook 3-4 minutes until whites are set.");
      lines.push("  - Serve straight from the skillet. Hit with hot sauce.");
      break;

    case "crepe":
      lines.push("PREP FIRST");
      lines.push("1. Blend: 1 cup flour, 2 eggs, ½ cup milk, ½ cup water, 2 tbsp melted butter, pinch of salt. Batter should be thin like heavy cream.");
      lines.push("2. Refrigerate batter 30 minutes (this lets gluten relax = tender crepes).");
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push("Step 1 — Non-stick pan: medium heat. Brush with butter.");
      lines.push("Pour 3 tbsp batter while tilting pan in a circle to spread thin and even.");
      lines.push("  - Cook 45 seconds until edges curl and bottom is lightly golden");
      lines.push("  - Flip (fingers or spatula) — cook 30 more seconds");
      lines.push("  - Stack on a plate with parchment between each");
      lines.push("Step 2 — Fill and fold: sweet (Nutella, berries, powdered sugar) or savory (ham, cheese, egg).");
      break;

    default:
      // General recipe — build from components
      lines.push("PREP FIRST");
      if (pg) lines.push(`1. ${pg.prep}`);
      lines.push(`${pg ? "2" : "1"}. Prepare ${cp.aromatics}.`);
      lines.push(`${pg ? "3" : "2"}. Measure out spices: ${cp.spices.slice(0, 3).join(", ")}.`);
      lines.push("");
      lines.push("COOKING STEPS");
      lines.push(`Step 1 — Large skillet or pot: medium heat. Add ${cp.oil}.`);
      lines.push(`Add aromatics. Cook 3-4 minutes until softened and fragrant.`);
      lines.push(`Add spices. Stir 30 seconds.`);
      if (pg) {
        lines.push("");
        lines.push(`Step 2 — ${pg.cookMethod}`);
        lines.push(`  - ${pg.doneCue}`);
      }
      lines.push("");
      lines.push(`Step ${pg ? "3" : "2"} — Add sauces: ${cp.sauces.join(", ")}. Simmer to combine flavors.`);
      lines.push(`Serve with ${cp.starchBase}. Garnish with ${cp.garnish}.`);
      break;
  }

  // Add tip and macros
  lines.push("");
  lines.push(`NEXT LEVEL TIP: ${getProTip(dishType, cuisine, protein)}`);
  lines.push("");
  lines.push(`SERVES: 2 people | Cook time: ${cookTime} min`);

  return lines.join("\n");
}

function generateProteinPrepSteps(lines: string[], pg: ProteinGuide | null, name: string, cuisine: string, cp: CuisineProfile) {
  if (pg) {
    lines.push(`1. ${pg.prep}`);
  }
  lines.push(`${pg ? "2" : "1"}. Prepare aromatics: ${cp.aromatics}`);
  lines.push(`${pg ? "3" : "2"}. Measure spices: ${cp.spices.slice(0, 3).join(", ")}`);
}

function generateProteinCookSteps(lines: string[], pg: ProteinGuide | null, name: string, cp: CuisineProfile, stepNum: string) {
  lines.push(`Step ${stepNum} — Large skillet: medium-high heat. Add ${cp.oil}.`);
  if (pg) {
    lines.push(pg.cookMethod);
    lines.push(`  - ${pg.doneCue}`);
  } else {
    lines.push(`Cook main ingredient 3-5 minutes per side until done.`);
  }
  lines.push(`Season with ${cp.spices[0]} and ${cp.spices[1] || "salt"}.`);
}

function getProTip(dishType: DishType, cuisine: string, protein: string | null): string {
  const tips: Record<string, string[]> = {
    omelette: ["Run a thin slick of cold butter over the finished omelette for a restaurant-quality glossy sheen.", "For the creamiest texture, pull the omelette off heat while the center is still slightly underset — it continues cooking on the plate."],
    scramble: ["Gordon Ramsay's secret: take the pan on and off the heat every 20 seconds. This gives you silky, custard-like curds instead of dry, rubbery eggs.", "A small knob of cold butter stirred in at the very end stops the cooking and adds richness."],
    toast: ["Toast the bread, let it cool 30 seconds, THEN add toppings. Direct heat from fresh toast melts avocado and makes it slide off.", "For restaurant-style poached eggs, add a splash of vinegar to the water and use the freshest eggs possible — the whites hold together better."],
    pancake: ["Let the batter rest 5-10 minutes before cooking. This hydrates the flour and relaxes the gluten for much more tender pancakes.", "Use a squeeze bottle for perfectly round pancakes every time."],
    waffle: ["Beating egg whites separately and folding them in is what makes waffles crispy on the outside and fluffy inside.", "Let waffles cool on a wire rack, not a plate — trapped steam makes them soggy."],
    tacos: ["Double up your tortillas (two per taco) like a street vendor. The inner tortilla absorbs juices while the outer one stays intact.", "Char your tortillas directly over an open flame for authentic smoky flavor."],
    curry: ["Bloom your dry spices in hot oil before adding anything else — this releases fat-soluble flavor compounds that water alone can't extract.", "Add a splash of acid (lime juice or vinegar) at the very end to brighten all the flavors."],
    soup: ["Always taste and adjust seasoning at the end. A squeeze of acid (lemon, lime, vinegar) can transform a flat soup.", "For extra body, blend 1 cup of the soup and stir it back in — instant creaminess without cream."],
    stew: ["Don't rush the browning step. Deep browning = deep flavor. Each piece of meat should be dark mahogany, not gray.", "A splash of vinegar or wine at the end brightens a stew that tastes 'flat.'"],
    stir_fry: ["The wok should be so hot that oil shimmers and wisps of smoke appear. This extreme heat is what creates 'wok hei' — the smoky, charred flavor of restaurant stir-fries.", "Cook proteins and vegetables separately, then combine at the end. This prevents overcrowding and steaming."],
    fried_rice: ["Press the rice flat against the hot wok surface and let it sit without stirring. This creates crispy, slightly charred grains — the hallmark of great fried rice.", "Add soy sauce to the hot wok's edge, not directly on the rice. The soy sauce caramelizes on contact, deepening the flavor."],
    pasta: ["Always finish pasta IN the sauce with a splash of pasta water. The starch creates a silky emulsion that binds sauce to noodles.", "Undercook pasta by 1 minute. It finishes cooking in the sauce, absorbing flavor instead of plain water."],
    noodles: ["Toss noodles with a tiny bit of sesame oil right after draining to prevent clumping.", "For pad thai, have everything within arm's reach — once the wok is hot, the entire dish comes together in under 3 minutes."],
    salad: ["Dress greens right before serving, but marinate heartier components (beans, grains) in dressing 10-15 minutes ahead.", "Massage kale with a pinch of salt and squeeze of lemon for 1 minute — it breaks down the tough fibers and turns bitter kale sweet and tender."],
    grilled: ["Let meat rest for half the time it was on the grill. This redistributes juices from the surface back to the center.", "Oil the protein, not the grill. It prevents sticking better and doesn't cause flare-ups."],
    kebab: ["Leave small gaps between items on the skewer — touching pieces steam instead of char.", "Alternate between meat and vegetables of similar cook times. Dense vegetables go on separate skewers."],
    fried: ["After breading, let items rest on a rack for 5-10 minutes. The coating dries slightly and adheres much better during frying.", "Don't fry too many pieces at once — each piece drops the oil temperature. Cold oil = greasy, soggy coating."],
    bowl: ["Texture contrast is everything in a bowl. Include something crunchy, something creamy, something fresh, and something savory.", "Drizzle sauce in a zigzag pattern and finish with a contrasting garnish — we eat with our eyes first."],
    rice_dish: ["Toast dry rice in oil for 2 minutes before adding liquid. This coats each grain and prevents sticking while adding nutty flavor.", "Never stir rice while it's cooking (except risotto). Let steam do the work."],
    sandwich: ["The order of layering matters: condiments touch bread (moisture barrier), then protein, then toppings. This prevents sogginess.", "Toast bread in the same pan you cooked the protein in — it absorbs all those browned, flavorful bits."],
    pizza: ["Stretch dough by draping it over your knuckles and letting gravity do the work. Never use a rolling pin — it pushes out air bubbles.", "A pizza stone preheated for 45 minutes at your oven's max temperature mimics a professional pizza oven."],
    benedict: ["Make hollandaise in a blender for foolproof results every time. The key is adding butter in a very slow, steady stream.", "If hollandaise breaks (gets grainy), whisk in 1 tsp of hot water — it usually comes back together."],
    general: ["Taste as you go. The difference between good and great cooking is adjusting seasoning throughout, not just at the end.", "When a dish tastes 'flat,' it usually needs acid (lemon, lime, vinegar) — not more salt."],
  };

  const options = tips[dishType] || tips.general;
  // Use a deterministic selection based on name hash
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return options[hash % options.length];
}

// ─── MAIN HANDLER ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all recipes without recipe_text
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("id, name, cuisine, primary_protein, cook_time, category, is_baby, tags, ingredients")
      .is("recipe_text", null)
      .limit(500);

    if (error) throw error;
    if (!recipes || recipes.length === 0) {
      return new Response(JSON.stringify({ message: "All recipes already have text", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const batchSize = 25;

    for (let i = 0; i < recipes.length; i += batchSize) {
      const batch = recipes.slice(i, i + batchSize);
      const updates = batch.map(recipe => {
        const dishType = detectDishType(recipe.name);
        const ingredients = getSpecificIngredients(
          recipe.name,
          recipe.cuisine,
          recipe.primary_protein,
          dishType
        );
        const recipeText = generateRecipeText(
          recipe.name,
          recipe.cuisine,
          recipe.primary_protein,
          recipe.cook_time || 30,
          dishType,
          ingredients
        );

        return supabase
          .from("recipes")
          .update({
            recipe_text: recipeText,
            ingredients: ingredients,
          })
          .eq("id", recipe.id);
      });

      const results = await Promise.all(updates);
      results.forEach(r => {
        if (!r.error) updated++;
        else console.error("Update error:", r.error);
      });
    }

    return new Response(JSON.stringify({ message: `Updated ${updated} recipes`, count: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
