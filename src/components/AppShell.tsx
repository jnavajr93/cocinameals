import { useState } from "react";
import { PantryTab } from "@/components/tabs/PantryTab";
import { MealsTab } from "@/components/tabs/MealsTab";
import { SavedTab } from "@/components/tabs/SavedTab";
import { ShoppingCart, UtensilsCrossed, BookOpen } from "lucide-react";

const TABS = [
  { id: "pantry", label: "Pantry", icon: ShoppingCart },
  { id: "meals", label: "Meals", icon: UtensilsCrossed },
  { id: "saved", label: "Saved", icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("pantry");

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "pantry" && <PantryTab />}
        {activeTab === "meals" && <MealsTab />}
        {activeTab === "saved" && <SavedTab />}
      </div>

      {/* Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-tab-bar flex items-center justify-around px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-0.5 px-4 py-1 transition-colors"
            >
              <Icon
                size={20}
                className={active ? "text-tab-active" : "text-tab-inactive"}
              />
              <span
                className={`font-body text-xs ${
                  active ? "text-tab-active font-medium" : "text-tab-inactive"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
