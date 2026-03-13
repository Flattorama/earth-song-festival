export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendees: {
        Row: {
          id: string
          purchase_id: string
          name: string
          email: string
          phone: string | null
          is_buyer: boolean | null
          waiver_status: string
          waiver_token: string | null
          waiver_signed_at: string | null
          waiver_ip_address: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          purchase_id: string
          name: string
          email: string
          phone?: string | null
          is_buyer?: boolean | null
          waiver_status?: string
          waiver_token?: string | null
          waiver_signed_at?: string | null
          waiver_ip_address?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          purchase_id?: string
          name?: string
          email?: string
          phone?: string | null
          is_buyer?: boolean | null
          waiver_status?: string
          waiver_token?: string | null
          waiver_signed_at?: string | null
          waiver_ip_address?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendees_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          }
        ]
      }
      referral_codes: {
        Row: {
          id: string
          code: string
          facilitator_name: string
          facilitator_email: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          code: string
          facilitator_name: string
          facilitator_email?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          facilitator_name?: string
          facilitator_email?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      newsletter_signups: {
        Row: {
          id: string
          name: string | null
          email: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          created_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          id: string
          stripe_session_id: string
          buyer_name: string
          buyer_email: string
          ticket_type: string
          quantity: number
          total_amount: number
          referral_code: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          stripe_session_id?: string
          buyer_name: string
          buyer_email: string
          ticket_type: string
          quantity?: number
          total_amount?: number
          referral_code?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          stripe_session_id?: string
          buyer_name?: string
          buyer_email?: string
          ticket_type?: string
          quantity?: number
          total_amount?: number
          referral_code?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          id: number
          user_id: string
          customer_id: string
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          user_id: string
          customer_id: string
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          user_id?: string
          customer_id?: string
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stripe_orders: {
        Row: {
          id: number
          checkout_session_id: string
          payment_intent_id: string
          customer_id: string
          amount_subtotal: number
          amount_total: number
          currency: string
          payment_status: string
          status: Database["public"]["Enums"]["stripe_order_status"]
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          checkout_session_id: string
          payment_intent_id: string
          customer_id: string
          amount_subtotal: number
          amount_total: number
          currency: string
          payment_status: string
          status?: Database["public"]["Enums"]["stripe_order_status"]
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          checkout_session_id?: string
          payment_intent_id?: string
          customer_id?: string
          amount_subtotal?: number
          amount_total?: number
          currency?: string
          payment_status?: string
          status?: Database["public"]["Enums"]["stripe_order_status"]
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          id: number
          customer_id: string
          subscription_id: string | null
          price_id: string | null
          current_period_start: number | null
          current_period_end: number | null
          cancel_at_period_end: boolean | null
          payment_method_brand: string | null
          payment_method_last4: string | null
          status: Database["public"]["Enums"]["stripe_subscription_status"]
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          customer_id: string
          subscription_id?: string | null
          price_id?: string | null
          current_period_start?: number | null
          current_period_end?: number | null
          cancel_at_period_end?: boolean | null
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          status: Database["public"]["Enums"]["stripe_subscription_status"]
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          customer_id?: string
          subscription_id?: string | null
          price_id?: string | null
          current_period_start?: number | null
          current_period_end?: number | null
          cancel_at_period_end?: boolean | null
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          status?: Database["public"]["Enums"]["stripe_subscription_status"]
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      volunteer_applications: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          about: string | null
          availability: string | null
          experience: string | null
          why_earth_song: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          about?: string | null
          availability?: string | null
          experience?: string | null
          why_earth_song?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          about?: string | null
          availability?: string | null
          experience?: string | null
          why_earth_song?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      waiver_acceptances: {
        Row: {
          id: string
          attendee_name: string
          attendee_email: string
          attendee_phone: string | null
          attendee_address: string | null
          ticket_type: string
          waiver_version: string
          ip_address: string | null
          accepted_at: string | null
          stripe_session_id: string | null
          referral_code: string | null
        }
        Insert: {
          id?: string
          attendee_name: string
          attendee_email: string
          attendee_phone?: string | null
          attendee_address?: string | null
          ticket_type: string
          waiver_version?: string
          ip_address?: string | null
          accepted_at?: string | null
          stripe_session_id?: string | null
          referral_code?: string | null
        }
        Update: {
          id?: string
          attendee_name?: string
          attendee_email?: string
          attendee_phone?: string | null
          attendee_address?: string | null
          ticket_type?: string
          waiver_version?: string
          ip_address?: string | null
          accepted_at?: string | null
          stripe_session_id?: string | null
          referral_code?: string | null
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
      stripe_order_status: "pending" | "completed" | "canceled"
      stripe_subscription_status:
        | "not_started"
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused"
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
      stripe_order_status: ["pending", "completed", "canceled"] as const,
      stripe_subscription_status: [
        "not_started",
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ] as const,
    },
  },
} as const
