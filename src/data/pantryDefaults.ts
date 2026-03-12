export interface PantryCategory {
  name: string;
  items: string[];
}

export const DEFAULT_PANTRY: PantryCategory[] = [
  {
    name: "Produce",
    items: [
      "Garlic", "Yellow Onion", "Red Onion", "Green Onion", "Shallots",
      "Ginger", "Tomatoes", "Potatoes", "Sweet Potatoes",
      "Carrots", "Celery", "Broccoli", "Cauliflower", "Zucchini",
      "Bell Peppers", "Jalapeños", "Serrano Peppers", "Poblano Peppers",
      "Cucumber", "Mushrooms", "Spinach", "Kale", "Mixed Greens",
      "Romaine Lettuce", "Cabbage", "Brussels Sprouts", "Asparagus",
      "Green Beans", "Snap Peas", "Corn", "Eggplant", "Beets",
      "Lemons", "Limes", "Oranges", "Avocados", "Bananas", "Apples",
      "Grapes", "Strawberries", "Blueberries", "Peaches",
      "Mangoes", "Pineapple", "Watermelon",
      "Cilantro", "Parsley", "Fresh Basil", "Fresh Mint", "Fresh Rosemary",
      "Fresh Thyme", "Chives", "Dill", "Lemongrass", "Tomatillos",
    ],
  },
  {
    name: "Proteins",
    items: [
      "Ground Beef", "Ground Turkey", "Ground Pork",
      "Chicken Breast", "Chicken Thighs", "Whole Chicken",
      "Chicken Drumsticks", "Chicken Wings",
      "Steak", "Beef Stew Meat", "Short Ribs", "Brisket",
      "Pork Chops", "Pork Tenderloin", "Pork Shoulder",
      "Ribs", "Pork Belly", "Lamb Chops", "Ground Lamb",
      "Italian Sausage", "Chorizo", "Bratwurst", "Hot Dogs",
      "Bacon", "Pancetta", "Prosciutto", "Deli Turkey", "Deli Ham",
      "Salmon", "Tilapia", "Cod", "Halibut", "Sea Bass",
      "Tuna", "Shrimp", "Scallops", "Crab Meat", "Lobster",
      "Clams", "Mussels", "Smoked Salmon",
      "Eggs", "Tofu", "Tempeh", "Edamame",
    ],
  },
  {
    name: "Dairy",
    items: [
      "Whole Milk", "Oat Milk", "Almond Milk",
      "Heavy Cream", "Half & Half", "Sour Cream",
      "Greek Yogurt", "Butter",
      "Cream Cheese", "Cheddar", "Mozzarella",
      "Parmesan", "Feta", "Goat Cheese", "Gouda",
      "Pepper Jack", "Swiss Cheese", "Ricotta",
      "Brie", "Cotija / Queso Fresco", "Mascarpone",
    ],
  },
  {
    name: "Grains & Bread",
    items: [
      "White Rice", "Brown Rice", "Jasmine Rice", "Basmati Rice",
      "Quinoa", "Farro", "Couscous",
      "Spaghetti", "Penne", "Fettuccine", "Linguine", "Orzo",
      "Rice Noodles", "Udon Noodles", "Egg Noodles", "Lasagna Sheets",
      "Sandwich Bread", "Sourdough", "Baguette",
      "Hamburger Buns", "Pita Bread", "Naan",
      "Flour Tortillas", "Corn Tortillas",
      "Bagels", "English Muffins", "Croissants",
      "Panko Breadcrumbs", "Crackers",
    ],
  },
  {
    name: "Pantry Staples",
    items: [
      "All-Purpose Flour", "Cornstarch", "Baking Powder", "Baking Soda",
      "Yeast", "White Sugar", "Brown Sugar", "Powdered Sugar",
      "Honey", "Maple Syrup", "Vanilla Extract",
      "Cocoa Powder", "Chocolate Chips", "Peanut Butter",
      "Tahini", "Jelly / Jam",
      "Oats", "Granola", "Pancake Mix", "Cornmeal",
    ],
  },
  {
    name: "Canned & Jarred",
    items: [
      "Diced Tomatoes", "Crushed Tomatoes", "Tomato Paste",
      "Marinara Sauce", "Pesto", "Alfredo Sauce",
      "Roasted Red Peppers", "Salsa", "Salsa Verde",
      "Chipotle in Adobo", "Enchilada Sauce",
      "Black Beans", "Pinto Beans", "Kidney Beans",
      "Chickpeas", "White Beans", "Refried Beans", "Lentils",
      "Canned Corn", "Coconut Milk (can)",
      "Chicken Broth", "Beef Broth", "Vegetable Broth",
      "Olives", "Capers", "Pickled Jalapeños", "Pickles",
      "Canned Tuna", "Oyster Sauce",
    ],
  },
  {
    name: "Oils & Vinegars",
    items: [
      "Olive Oil", "Vegetable Oil", "Avocado Oil",
      "Coconut Oil", "Sesame Oil", "Cooking Spray",
      "Red Wine Vinegar", "Apple Cider Vinegar",
      "Balsamic Vinegar", "Rice Vinegar", "White Vinegar", "Mirin",
    ],
  },
  {
    name: "Sauces & Condiments",
    items: [
      "Soy Sauce", "Fish Sauce", "Worcestershire Sauce",
      "Hot Sauce", "Sriracha", "Gochujang",
      "Hoisin Sauce", "Teriyaki Sauce", "Sweet Chili Sauce",
      "Miso Paste",
      "Mayonnaise", "Dijon Mustard", "Yellow Mustard",
      "Ketchup", "BBQ Sauce", "Buffalo Sauce", "Ranch Dressing",
      "Hummus", "Tzatziki",
    ],
  },
  {
    name: "Spices & Herbs",
    items: [
      "Salt", "Black Pepper", "Red Pepper Flakes", "Cayenne",
      "Smoked Paprika", "Chili Powder",
      "Cumin", "Coriander", "Turmeric",
      "Garlic Powder", "Onion Powder",
      "Oregano", "Thyme", "Rosemary", "Basil", "Parsley", "Bay Leaves",
      "Italian Seasoning", "Tajín", "Old Bay", "Lemon Pepper",
      "Curry Powder", "Garam Masala", "Cinnamon", "Nutmeg",
      "Five Spice Powder", "Sesame Seeds",
      "Za'atar", "Adobo Seasoning", "Chicken Bouillon",
    ],
  },
  {
    name: "Frozen",
    items: [
      "Frozen Fries", "Frozen Hash Browns",
      "Frozen Peas", "Frozen Corn", "Frozen Broccoli",
      "Frozen Mixed Vegetables", "Frozen Spinach",
      "Frozen Stir Fry Vegetables", "Frozen Dumplings",
      "Frozen Fish Fillets", "Frozen Shrimp",
      "Frozen Berries", "Ice Cream",
    ],
  },
];
