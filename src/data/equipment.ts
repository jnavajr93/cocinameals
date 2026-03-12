export interface EquipmentCategory {
  name: string;
  items: string[];
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    name: "Cooking Surfaces",
    items: [
      "Gas Stove", "Electric Stove", "Induction Cooktop", "Portable Burner",
      "Propane Grill", "Charcoal Grill", "Pellet Smoker / Offset Smoker",
      "Flat Top Griddle (outdoor)",
    ],
  },
  {
    name: "Ovens & Broilers",
    items: [
      "Electric Oven", "Gas Oven", "Convection Oven",
      "Broiler (built-in)", "Wood-Fired / Pizza Oven",
    ],
  },
  {
    name: "Countertop Appliances",
    items: [
      "Air Fryer", "Microwave", "Instant Pot / Pressure Cooker",
      "Slow Cooker / Crock Pot", "Rice Cooker", "Toaster", "Toaster Oven",
      "Waffle Maker", "Panini Press", "Electric Griddle",
      "Sous Vide Circulator", "Dehydrator", "Bread Maker",
      "Deep Fryer", "Sandwich Maker", "Egg Cooker",
    ],
  },
  {
    name: "Blending & Processing",
    items: [
      "Blender", "Immersion / Stick Blender", "Food Processor",
      "Stand Mixer (KitchenAid etc.)", "Hand Mixer",
      "Spice Grinder / Coffee Grinder", "Juicer", "Mandoline Slicer",
    ],
  },
  {
    name: "Pots & Pans",
    items: [
      "Non-stick Frying Pan", "Stainless Frying Pan", "Cast Iron Skillet",
      "Carbon Steel Pan", "Sauté Pan", "Small Saucepan", "Large Saucepan",
      "Stock Pot / Soup Pot", "Dutch Oven", "Rondeau / Braiser",
      "Wok / Stir Fry Pan", "Stovetop Griddle Pan",
      "Comal / Tortilla Griddle", "Paella Pan", "Crepe Pan",
    ],
  },
  {
    name: "Baking",
    items: [
      "Sheet Pan / Baking Tray", "Muffin / Cupcake Tray", "Glass Baking Dish",
      "Ceramic Baking Dish", "Round Cake Pan", "Loaf Pan",
      "Springform Pan", "Tart / Quiche Pan", "Pizza Stone",
      "Round Pizza Tray", "Bundt Pan", "Ramekins",
    ],
  },
  {
    name: "Tools",
    items: [
      "Chef's Knife", "Paring Knife", "Bread Knife", "Kitchen Shears",
      "Cutting Board", "Mortar & Pestle", "Kitchen Scale",
      "Meat Thermometer", "Box Grater", "Microplane / Zester",
      "Fine Mesh Strainer", "Colander", "Mixing Bowls",
      "Rolling Pin", "Tongs", "Whisk", "Salad Spinner",
    ],
  },
];

// Common items most kitchens have — pre-selected during onboarding
export const DEFAULT_EQUIPMENT: string[] = [];
