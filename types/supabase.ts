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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ab_test_evaluations: {
        Row: {
          ab_test_id: string
          created_at: string
          id: string
          persona_id: string
          preference_rank: number | null
          score: number
          variant_id: string
        }
        Insert: {
          ab_test_id: string
          created_at?: string
          id?: string
          persona_id: string
          preference_rank?: number | null
          score: number
          variant_id: string
        }
        Update: {
          ab_test_id?: string
          created_at?: string
          id?: string
          persona_id?: string
          preference_rank?: number | null
          score?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_evaluations_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_evaluations_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_evaluations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_test_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_test_variants: {
        Row: {
          ab_test_id: string
          avg_score: number | null
          content: string
          created_at: string
          id: string
          image_urls: string[] | null
          name: string
          total_evaluations: number
          total_score: number
          win_rate: number | null
        }
        Insert: {
          ab_test_id: string
          avg_score?: number | null
          content: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          name: string
          total_evaluations?: number
          total_score?: number
          win_rate?: number | null
        }
        Update: {
          ab_test_id?: string
          avg_score?: number | null
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          name?: string
          total_evaluations?: number
          total_score?: number
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_variants_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          algorithm: string
          created_at: string
          draft_id: string
          ended_at: string | null
          epsilon: number | null
          id: string
          name: string
          started_at: string | null
          status: Database["public"]["Enums"]["ab_test_status"]
        }
        Insert: {
          algorithm?: string
          created_at?: string
          draft_id: string
          ended_at?: string | null
          epsilon?: number | null
          id?: string
          name: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ab_test_status"]
        }
        Update: {
          algorithm?: string
          created_at?: string
          draft_id?: string
          ended_at?: string | null
          epsilon?: number | null
          id?: string
          name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ab_test_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personas: {
        Row: {
          active: boolean | null
          id: string
          name: string | null
          system_prompt: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string
          name?: string | null
          system_prompt?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string
          name?: string | null
          system_prompt?: string | null
        }
        Relationships: []
      }
      council_feedback: {
        Row: {
          created_at: string
          cringe_score: number
          critique: string
          draft_id: string
          excitement_score: number
          id: string
          iteration_number: number
          persona_id: string
          specific_fix: string | null
        }
        Insert: {
          created_at?: string
          cringe_score: number
          critique: string
          draft_id: string
          excitement_score: number
          id?: string
          iteration_number?: number
          persona_id: string
          specific_fix?: string | null
        }
        Update: {
          created_at?: string
          cringe_score?: number
          critique?: string
          draft_id?: string
          excitement_score?: number
          id?: string
          iteration_number?: number
          persona_id?: string
          specific_fix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "council_feedback_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_feedback_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          avg_cringe_score: number | null
          avg_excitement_score: number | null
          content: string
          created_at: string
          id: string
          image_urls: string[] | null
          iteration_count: number
          quality_score: number | null
          status: Database["public"]["Enums"]["draft_status"]
          updated_at: string
        }
        Insert: {
          avg_cringe_score?: number | null
          avg_excitement_score?: number | null
          content: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          iteration_count?: number
          quality_score?: number | null
          status?: Database["public"]["Enums"]["draft_status"]
          updated_at?: string
        }
        Update: {
          avg_cringe_score?: number | null
          avg_excitement_score?: number | null
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          iteration_count?: number
          quality_score?: number | null
          status?: Database["public"]["Enums"]["draft_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ab_test_status: "draft" | "running" | "paused" | "completed"
      draft_status:
        | "pending"
        | "processing"
        | "approved"
        | "rejected"
        | "shipped"
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
    Enums: {
      ab_test_status: ["draft", "running", "paused", "completed"],
      draft_status: [
        "pending",
        "processing",
        "approved",
        "rejected",
        "shipped",
      ],
    },
  },
} as const
