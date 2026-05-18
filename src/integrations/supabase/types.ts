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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          company_id: string
          created_at: string
          expected_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          status: string
          variance: number | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          company_id: string
          created_at?: string
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount?: number
          status?: string
          variance?: number | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          company_id?: string
          created_at?: string
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          status?: string
          variance?: number | null
        }
        Relationships: []
      }
      cash_variance_logs: {
        Row: {
          abs_variance: number
          company_id: string
          counted_amount: number
          created_at: string
          expected_amount: number
          id: string
          justification: string | null
          occurred_at: string
          session_id: string
          severity: string
          threshold_major: number
          threshold_minor: number
          user_id: string | null
          variance: number
        }
        Insert: {
          abs_variance: number
          company_id: string
          counted_amount: number
          created_at?: string
          expected_amount: number
          id?: string
          justification?: string | null
          occurred_at?: string
          session_id: string
          severity: string
          threshold_major?: number
          threshold_minor?: number
          user_id?: string | null
          variance: number
        }
        Update: {
          abs_variance?: number
          company_id?: string
          counted_amount?: number
          created_at?: string
          expected_amount?: number
          id?: string
          justification?: string | null
          occurred_at?: string
          session_id?: string
          severity?: string
          threshold_major?: number
          threshold_minor?: number
          user_id?: string | null
          variance?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          sector: Database["public"]["Enums"]["business_sector"]
          siret: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          sector?: Database["public"]["Enums"]["business_sector"]
          siret?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          sector?: Database["public"]["Enums"]["business_sector"]
          siret?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_id: string
          country: string
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id: string
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_archives: {
        Row: {
          archived_at: string
          company_id: string
          hash: string
          id: string
          payload: Json
          sale_id: string
        }
        Insert: {
          archived_at?: string
          company_id: string
          hash: string
          id?: string
          payload: Json
          sale_id: string
        }
        Update: {
          archived_at?: string
          company_id?: string
          hash?: string
          id?: string
          payload?: Json
          sale_id?: string
        }
        Relationships: []
      }
      invoice_counters: {
        Row: {
          company_id: string
          last_number: number
          year_month: string
        }
        Insert: {
          company_id: string
          last_number?: number
          year_month: string
        }
        Update: {
          company_id?: string
          last_number?: number
          year_month?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          purchase_price: number
          sale_price: number
          sku: string | null
          stock_alert_threshold: number
          stock_quantity: number
          unit: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          purchase_price?: number
          sale_price?: number
          sku?: string | null
          stock_alert_threshold?: number
          stock_quantity?: number
          unit?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          barcode?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          purchase_price?: number
          sale_price?: number
          sku?: string | null
          stock_alert_threshold?: number
          stock_quantity?: number
          unit?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          company_id: string
          created_at: string
          discount_percent: number
          id: string
          line_total_ht: number
          line_total_ttc: number
          line_total_vat: number
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_price_ht: number
          vat_rate: number
        }
        Insert: {
          company_id: string
          created_at?: string
          discount_percent?: number
          id?: string
          line_total_ht?: number
          line_total_ttc?: number
          line_total_vat?: number
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          unit_price_ht?: number
          vat_rate?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          discount_percent?: number
          id?: string
          line_total_ht?: number
          line_total_ttc?: number
          line_total_vat?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          unit_price_ht?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_sequences: {
        Row: {
          company_id: string
          last_number: number
        }
        Insert: {
          company_id: string
          last_number?: number
        }
        Update: {
          company_id?: string
          last_number?: number
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount_change: number
          amount_paid: number
          cashier_id: string | null
          company_id: string
          created_at: string
          current_hash: string | null
          customer_id: string | null
          id: string
          invoice_number: string
          is_credit_note: boolean
          is_locked: boolean
          notes: string | null
          original_sale_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          previous_hash: string | null
          sequence_number: number | null
          session_id: string | null
          signed_at: string | null
          sold_at: string
          status: Database["public"]["Enums"]["sale_status"]
          total_ht: number
          total_ttc: number
          total_vat: number
          updated_at: string
        }
        Insert: {
          amount_change?: number
          amount_paid?: number
          cashier_id?: string | null
          company_id: string
          created_at?: string
          current_hash?: string | null
          customer_id?: string | null
          id?: string
          invoice_number: string
          is_credit_note?: boolean
          is_locked?: boolean
          notes?: string | null
          original_sale_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          previous_hash?: string | null
          sequence_number?: number | null
          session_id?: string | null
          signed_at?: string | null
          sold_at?: string
          status?: Database["public"]["Enums"]["sale_status"]
          total_ht?: number
          total_ttc?: number
          total_vat?: number
          updated_at?: string
        }
        Update: {
          amount_change?: number
          amount_paid?: number
          cashier_id?: string | null
          company_id?: string
          created_at?: string
          current_hash?: string | null
          customer_id?: string | null
          id?: string
          invoice_number?: string
          is_credit_note?: boolean
          is_locked?: boolean
          notes?: string | null
          original_sale_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          previous_hash?: string | null
          sequence_number?: number | null
          session_id?: string | null
          signed_at?: string | null
          sold_at?: string
          status?: Database["public"]["Enums"]["sale_status"]
          total_ht?: number
          total_ttc?: number
          total_vat?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_original_sale_id_fkey"
            columns: ["original_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_journal: {
        Row: {
          company_id: string
          current_hash: string
          id: string
          invoice_number: string
          previous_hash: string
          recorded_at: string
          sale_id: string
          sequence_number: number
          sold_at: string
          total_ht: number
          total_ttc: number
          total_vat: number
        }
        Insert: {
          company_id: string
          current_hash: string
          id?: string
          invoice_number: string
          previous_hash: string
          recorded_at?: string
          sale_id: string
          sequence_number: number
          sold_at: string
          total_ht: number
          total_ttc: number
          total_vat: number
        }
        Update: {
          company_id?: string
          current_hash?: string
          id?: string
          invoice_number?: string
          previous_hash?: string
          recorded_at?: string
          sale_id?: string
          sequence_number?: number
          sold_at?: string
          total_ht?: number
          total_ttc?: number
          total_vat?: number
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          id: string
          movement_type: string
          product_id: string
          product_name: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reason: string | null
          reference: string | null
          total_value: number
          unit_cost: number
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          movement_type: string
          product_id: string
          product_name: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reason?: string | null
          reference?: string | null
          total_value?: number
          unit_cost?: number
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          movement_type?: string
          product_id?: string
          product_name?: string
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          reason?: string | null
          reference?: string | null
          total_value?: number
          unit_cost?: number
          user_id?: string | null
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vat_rates: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          rate: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          rate: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymize_customer: { Args: { _customer_id: string }; Returns: undefined }
      cancel_sale: {
        Args: { _reason: string; _sale_id: string }
        Returns: string
      }
      close_cash_session: {
        Args: { _closing_amount: number; _company_id: string; _notes: string }
        Returns: string
      }
      create_sale: {
        Args: {
          _amount_paid: number
          _company_id: string
          _customer_id: string
          _items: Json
          _notes: string
          _payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: string
      }
      has_role_in_company: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_rgpd_action: {
        Args: { _action: string; _customer_id: string }
        Returns: undefined
      }
      next_invoice_number: { Args: { _company_id: string }; Returns: string }
      open_cash_session: {
        Args: { _company_id: string; _opening_amount: number }
        Returns: string
      }
      record_stock_movement: {
        Args: {
          _movement_type: string
          _product_id: string
          _quantity: number
          _reason?: string
          _reference?: string
          _target_quantity?: number
          _unit_cost?: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_entreprise"
        | "caissier"
        | "comptable"
        | "employe"
      business_sector:
        | "boulangerie"
        | "supermarche"
        | "boucherie"
        | "tabac"
        | "epicerie"
        | "restaurant"
        | "autre"
      payment_method:
        | "especes"
        | "carte"
        | "cheque"
        | "virement"
        | "ticket_restaurant"
        | "autre"
      sale_status: "en_cours" | "validee" | "annulee" | "remboursee"
      subscription_plan: "essai" | "standard" | "premium" | "entreprise"
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
      app_role: [
        "super_admin",
        "admin_entreprise",
        "caissier",
        "comptable",
        "employe",
      ],
      business_sector: [
        "boulangerie",
        "supermarche",
        "boucherie",
        "tabac",
        "epicerie",
        "restaurant",
        "autre",
      ],
      payment_method: [
        "especes",
        "carte",
        "cheque",
        "virement",
        "ticket_restaurant",
        "autre",
      ],
      sale_status: ["en_cours", "validee", "annulee", "remboursee"],
      subscription_plan: ["essai", "standard", "premium", "entreprise"],
    },
  },
} as const
