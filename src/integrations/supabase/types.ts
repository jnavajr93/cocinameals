export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      children: {
        Row: {
          created_at: string | null
          date_of_birth: string
          health_conditions: Json | null
          household_id: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth: string
          health_conditions?: Json | null
          household_id: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string
          health_conditions?: Json | null
          household_id?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          last_seen: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          last_seen?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          last_seen?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_profile: {
        Row: {
          cuisine_sliders: Json | null
          equipment: Json | null
          household_id: string
          id: string
          meal_prep_days: Json | null
          meal_sections: Json | null
          quick_filters: Json | null
          updated_at: string | null
        }
        Insert: {
          cuisine_sliders?: Json | null
          equipment?: Json | null
          household_id: string
          id?: string
          meal_prep_days?: Json | null
          meal_sections?: Json | null
          quick_filters?: Json | null
          updated_at?: string | null
        }
        Update: {
          cuisine_sliders?: Json | null
          equipment?: Json | null
          household_id?: string
          id?: string
          meal_prep_days?: Json | null
          meal_sections?: Json | null
          quick_filters?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_profile_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          household_size: number | null
          id: string
          invite_code: string
          name: string | null
          non_app_members: Json | null
        }
        Insert: {
          created_at?: string | null
          household_size?: number | null
          id?: string
          invite_code: string
          name?: string | null
          non_app_members?: Json | null
        }
        Update: {
          created_at?: string | null
          household_size?: number | null
          id?: string
          invite_code?: string
          name?: string | null
          non_app_members?: Json | null
        }
        Relationships: []
      }
      meal_feedback: {
        Row: {
          created_at: string | null
          feedback: string
          household_id: string
          id: string
          meal_name: string
          tags: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback: string
          household_id: string
          id?: string
          meal_name: string
          tags?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback?: string
          household_id?: string
          id?: string
          meal_name?: string
          tags?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_feedback_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_items: {
        Row: {
          category: string
          created_at: string | null
          expires_at: string | null
          household_id: string
          id: string
          in_stock: boolean | null
          is_custom: boolean | null
          is_hidden: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          expires_at?: string | null
          household_id: string
          id?: string
          in_stock?: boolean | null
          is_custom?: boolean | null
          is_hidden?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          expires_at?: string | null
          household_id?: string
          id?: string
          in_stock?: boolean | null
          is_custom?: boolean | null
          is_hidden?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pantry_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_meals: {
        Row: {
          calories: number | null
          carbs: number | null
          cook_time: number | null
          created_at: string | null
          fat: number | null
          household_id: string
          id: string
          meal_name: string
          protein: number | null
          saved_by: string | null
          tags: Json | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          cook_time?: number | null
          created_at?: string | null
          fat?: number | null
          household_id: string
          id?: string
          meal_name: string
          protein?: number | null
          saved_by?: string | null
          tags?: Json | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          cook_time?: number | null
          created_at?: string | null
          fat?: number | null
          household_id?: string
          id?: string
          meal_name?: string
          protein?: number | null
          saved_by?: string | null
          tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_meals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_recipes: {
        Row: {
          created_at: string | null
          household_id: string
          id: string
          meal_name: string
          recipe_text: string
          saved_by: string | null
        }
        Insert: {
          created_at?: string | null
          household_id: string
          id?: string
          meal_name: string
          recipe_text: string
          saved_by?: string | null
        }
        Update: {
          created_at?: string | null
          household_id?: string
          id?: string
          meal_name?: string
          recipe_text?: string
          saved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          allergies: Json | null
          diet_restrictions: Json | null
          dislikes: Json | null
          health_conditions: Json | null
          household_id: string | null
          id: string
          section_order: Json | null
          skill_level: string | null
          spice_tolerance: string | null
          updated_at: string | null
          user_id: string
          weeknight_time: string | null
        }
        Insert: {
          allergies?: Json | null
          diet_restrictions?: Json | null
          dislikes?: Json | null
          health_conditions?: Json | null
          household_id?: string | null
          id?: string
          section_order?: Json | null
          skill_level?: string | null
          spice_tolerance?: string | null
          updated_at?: string | null
          user_id: string
          weeknight_time?: string | null
        }
        Update: {
          allergies?: Json | null
          diet_restrictions?: Json | null
          dislikes?: Json | null
          health_conditions?: Json | null
          household_id?: string | null
          id?: string
          section_order?: Json | null
          skill_level?: string | null
          spice_tolerance?: string | null
          updated_at?: string | null
          user_id?: string
          weeknight_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_household_id: { Args: { p_user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
