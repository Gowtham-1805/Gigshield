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
      appeals: {
        Row: {
          admin_notes: string | null
          claim_id: string
          created_at: string
          evidence_urls: string[] | null
          id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          claim_id: string
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          claim_id?: string
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: true
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          amount: number
          created_at: string
          fraud_details: Json | null
          fraud_score: number
          id: string
          incident_id: string | null
          policy_id: string
          status: Database["public"]["Enums"]["claim_status"]
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          fraud_details?: Json | null
          fraud_score?: number
          id?: string
          incident_id?: string | null
          policy_id: string
          status?: Database["public"]["Enums"]["claim_status"]
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fraud_details?: Json | null
          fraud_score?: number
          id?: string
          incident_id?: string | null
          policy_id?: string
          status?: Database["public"]["Enums"]["claim_status"]
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          id: string
          is_simulated: boolean
          severity: number
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          weather_data: Json | null
          zone_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_simulated?: boolean
          severity?: number
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          weather_data?: Json | null
          zone_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_simulated?: boolean
          severity?: number
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
          weather_data?: Json | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          claim_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          amount: number
          claim_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          amount?: number
          claim_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          created_at: string
          end_date: string
          id: string
          max_payout: number
          premium: number
          start_date: string
          status: Database["public"]["Enums"]["policy_status"]
          tier: Database["public"]["Enums"]["policy_tier"]
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string
          id?: string
          max_payout: number
          premium: number
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"]
          tier?: Database["public"]["Enums"]["policy_tier"]
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          max_payout?: number
          premium?: number
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"]
          tier?: Database["public"]["Enums"]["policy_tier"]
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weather_readings: {
        Row: {
          aqi: number | null
          humidity: number | null
          id: string
          rainfall: number | null
          raw_data: Json | null
          recorded_at: string
          temperature: number | null
          wind_speed: number | null
          zone_id: string
        }
        Insert: {
          aqi?: number | null
          humidity?: number | null
          id?: string
          rainfall?: number | null
          raw_data?: Json | null
          recorded_at?: string
          temperature?: number | null
          wind_speed?: number | null
          zone_id: string
        }
        Update: {
          aqi?: number | null
          humidity?: number | null
          id?: string
          rainfall?: number | null
          raw_data?: Json | null
          recorded_at?: string
          temperature?: number | null
          wind_speed?: number | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_readings_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
          phone: string | null
          platform: string
          shield_score: number
          updated_at: string
          user_id: string
          weekly_earnings: number
          zone_id: string | null
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          platform?: string
          shield_score?: number
          updated_at?: string
          user_id: string
          weekly_earnings?: number
          zone_id?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          platform?: string
          shield_score?: number
          updated_at?: string
          user_id?: string
          weekly_earnings?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          city: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          risk_score: number
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          id: string
          lat: number
          lng: number
          name: string
          risk_score?: number
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          risk_score?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      claim_status: "approved" | "processing" | "flagged" | "rejected"
      notification_type: "weather" | "claim" | "payout"
      payout_status: "pending" | "completed" | "failed"
      policy_status: "active" | "expired" | "cancelled"
      policy_tier: "BASIC" | "STANDARD" | "PRO"
      trigger_type:
        | "RAIN_HEAVY"
        | "RAIN_EXTREME"
        | "HEAT_EXTREME"
        | "AQI_SEVERE"
        | "CURFEW_LOCAL"
        | "STORM_CYCLONE"
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
      app_role: ["admin", "moderator", "user"],
      claim_status: ["approved", "processing", "flagged", "rejected"],
      notification_type: ["weather", "claim", "payout"],
      payout_status: ["pending", "completed", "failed"],
      policy_status: ["active", "expired", "cancelled"],
      policy_tier: ["BASIC", "STANDARD", "PRO"],
      trigger_type: [
        "RAIN_HEAVY",
        "RAIN_EXTREME",
        "HEAT_EXTREME",
        "AQI_SEVERE",
        "CURFEW_LOCAL",
        "STORM_CYCLONE",
      ],
    },
  },
} as const
