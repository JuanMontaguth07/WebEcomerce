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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_last_seen: {
        Row: {
          seen_at: string
          user_id: string
        }
        Insert: {
          seen_at?: string
          user_id: string
        }
        Update: {
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_last_seen_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          changes: Json | null
          entity: string
          entity_id: string | null
          entity_label: string | null
          id: number
          occurred_at: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          changes?: Json | null
          entity: string
          entity_id?: string | null
          entity_label?: string | null
          id?: never
          occurred_at?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          changes?: Json | null
          entity?: string
          entity_id?: string | null
          entity_label?: string | null
          id?: never
          occurred_at?: string
          reason?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_path: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      build_components: {
        Row: {
          build_id: string
          demo_part_id: string | null
          kind: string
          name: string
          position: number
          price: number
          product_id: string | null
          sku: string | null
        }
        Insert: {
          build_id: string
          demo_part_id?: string | null
          kind: string
          name: string
          position: number
          price: number
          product_id?: string | null
          sku?: string | null
        }
        Update: {
          build_id?: string
          demo_part_id?: string | null
          kind?: string
          name?: string
          position?: number
          price?: number
          product_id?: string | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "build_components_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          answers: Json | null
          budget: number | null
          created_at: string
          currency: string
          id: string
          mode: string
          name: string
          parent_id: string | null
          share_code: string
          source: string
          total: number
        }
        Insert: {
          answers?: Json | null
          budget?: number | null
          created_at?: string
          currency?: string
          id?: string
          mode: string
          name: string
          parent_id?: string | null
          share_code: string
          source: string
          total: number
        }
        Update: {
          answers?: Json | null
          budget?: number | null
          created_at?: string
          currency?: string
          id?: string
          mode?: string
          name?: string
          parent_id?: string | null
          share_code?: string
          source?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "builds_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          architect_part: string | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          position: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          architect_part?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          position?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          architect_part?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      home_banners: {
        Row: {
          body: string | null
          created_at: string
          cta_href: string | null
          cta_label: string | null
          eyebrow: string | null
          id: string
          illustration: string
          image_path: string | null
          is_active: boolean
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          eyebrow?: string | null
          id?: string
          illustration?: string
          image_path?: string | null
          is_active?: boolean
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          eyebrow?: string | null
          id?: string
          illustration?: string
          image_path?: string | null
          is_active?: boolean
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          order_id: string | null
          previous_stock: number
          product_id: string | null
          product_name: string
          product_sku: string
          quantity: number
          reason: string | null
          resulting_stock: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          order_id?: string | null
          previous_stock: number
          product_id?: string | null
          product_name: string
          product_sku: string
          quantity: number
          reason?: string | null
          resulting_stock: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          order_id?: string | null
          previous_stock?: number
          product_id?: string | null
          product_name?: string
          product_sku?: string
          quantity?: number
          reason?: string | null
          resulting_stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku: string
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token_hash: string
          address: string
          city: string
          created_at: string
          currency: string
          customer_document: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          data_consent_at: string
          department: string
          expires_at: string | null
          id: string
          notes: string | null
          order_number: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_cost: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token_hash: string
          address: string
          city: string
          created_at?: string
          currency?: string
          customer_document?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          data_consent_at: string
          department: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          order_number?: never
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token_hash?: string
          address?: string
          city?: string
          created_at?: string
          currency?: string
          customer_document?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          data_consent_at?: string
          department?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          order_number?: never
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          provider: string
          provider_reference: string | null
          raw_payload: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          provider: string
          provider_reference?: string | null
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          provider?: string
          provider_reference?: string | null
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_flags: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          logo_path: string | null
          name: string
          show_name: boolean
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name: string
          show_name?: boolean
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name?: string
          show_name?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          height: number | null
          id: string
          position: number
          product_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          alt_text: string
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          product_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          product_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specs: {
        Row: {
          product_id: string
          spec_id: string
          value_boolean: boolean | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          product_id: string
          spec_id: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          product_id?: string
          spec_id?: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_specs_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "spec_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          flag_id: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          low_stock_threshold: number
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          rarity_id: string | null
          search_vector: unknown
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sku: string
          slug: string
          stock: number
          unique_note: string | null
          updated_at: string
          warranty_months: number | null
        }
        Insert: {
          brand_id?: string | null
          category_id: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          flag_id?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          name: string
          price: number
          product_type?: Database["public"]["Enums"]["product_type"]
          rarity_id?: string | null
          search_vector?: unknown
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku: string
          slug: string
          stock?: number
          unique_note?: string | null
          updated_at?: string
          warranty_months?: number | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          flag_id?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          rarity_id?: string | null
          search_vector?: unknown
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string
          slug?: string
          stock?: number
          unique_note?: string | null
          updated_at?: string
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "product_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_rarity_id_fkey"
            columns: ["rarity_id"]
            isOneToOne: false
            referencedRelation: "rarities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_accent: string
          admin_font: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          admin_accent?: string
          admin_font?: string
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          admin_accent?: string
          admin_font?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rarities: {
        Row: {
          color: string
          created_at: string
          description: string | null
          effect: string
          id: string
          is_active: boolean
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string | null
          effect?: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          effect?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          city: string | null
          city_key: string | null
          created_at: string
          department: string
          id: string
          is_active: boolean
          max_days: number | null
          min_days: number | null
          price: number
          updated_at: string
        }
        Insert: {
          city?: string | null
          city_key?: string | null
          created_at?: string
          department: string
          id?: string
          is_active?: boolean
          max_days?: number | null
          min_days?: number | null
          price: number
          updated_at?: string
        }
        Update: {
          city?: string | null
          city_key?: string | null
          created_at?: string
          department?: string
          id?: string
          is_active?: boolean
          max_days?: number | null
          min_days?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      spec_definitions: {
        Row: {
          category_id: string
          created_at: string
          data_type: Database["public"]["Enums"]["spec_data_type"]
          group_label: string | null
          id: string
          is_filterable: boolean
          key: string
          label: string
          position: number
          show_on_card: boolean
          unit: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          data_type?: Database["public"]["Enums"]["spec_data_type"]
          group_label?: string | null
          id?: string
          is_filterable?: boolean
          key: string
          label: string
          position?: number
          show_on_card?: boolean
          unit?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          data_type?: Database["public"]["Enums"]["spec_data_type"]
          group_label?: string | null
          id?: string
          is_filterable?: boolean
          key?: string
          label?: string
          position?: number
          show_on_card?: boolean
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spec_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          announcement_enabled: boolean
          announcement_href: string | null
          announcement_text: string | null
          id: boolean
          legal_address: string | null
          legal_city: string | null
          legal_dv: string | null
          legal_name: string | null
          legal_nit: string | null
          nequi_holder: string | null
          nequi_number: string | null
          support_email: string | null
          support_hours: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          announcement_enabled?: boolean
          announcement_href?: string | null
          announcement_text?: string | null
          id?: boolean
          legal_address?: string | null
          legal_city?: string | null
          legal_dv?: string | null
          legal_name?: string | null
          legal_nit?: string | null
          nequi_holder?: string | null
          nequi_number?: string | null
          support_email?: string | null
          support_hours?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          announcement_enabled?: boolean
          announcement_href?: string | null
          announcement_text?: string | null
          id?: boolean
          legal_address?: string | null
          legal_city?: string | null
          legal_dv?: string | null
          legal_name?: string | null
          legal_nit?: string | null
          nequi_holder?: string | null
          nequi_number?: string | null
          support_email?: string | null
          support_hours?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          p_movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          p_product_id: string
          p_quantity: number
          p_reason: string
        }
        Returns: number
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_sales_series: {
        Args: { p_days?: number }
        Returns: {
          day: string
          orders: number
          revenue: number
        }[]
      }
      admin_top_products: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          product_id: string
          product_name: string
          revenue: number
          sku: string
          units: number
        }[]
      }
      best_selling_products: {
        Args: { p_limit?: number }
        Returns: {
          product_id: string
          units: number
        }[]
      }
      build_product_search_vector: {
        Args: {
          p_brand_name: string
          p_category_name: string
          p_name: string
          p_short_description: string
          p_sku: string
        }
        Returns: unknown
      }
      calculate_shipping_cost: {
        Args: { p_city: string; p_department: string; p_subtotal: number }
        Returns: number
      }
      catalog_facets: {
        Args: {
          p_category?: string
          p_in_stock?: boolean
          p_on_sale?: boolean
          p_product_type?: Database["public"]["Enums"]["product_type"]
          p_query?: string
        }
        Returns: Json
      }
      catalog_matches: {
        Args: {
          p_brands?: string[]
          p_category?: string
          p_in_stock?: boolean
          p_max_price?: number
          p_min_price?: number
          p_on_sale?: boolean
          p_product_type?: Database["public"]["Enums"]["product_type"]
          p_query?: string
        }
        Returns: {
          product_id: string
          rank: number
        }[]
      }
      catalog_search: {
        Args: {
          p_brands?: string[]
          p_category?: string
          p_in_stock?: boolean
          p_limit?: number
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_on_sale?: boolean
          p_product_type?: Database["public"]["Enums"]["product_type"]
          p_query?: string
          p_sort?: string
        }
        Returns: {
          brand_name: string
          brand_slug: string
          category_name: string
          category_slug: string
          compare_at_price: number
          created_at: string
          flag_id: string
          id: string
          image_alt: string
          image_path: string
          is_featured: boolean
          low_stock_threshold: number
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          rarity_id: string
          short_description: string
          sku: string
          slug: string
          stock: number
          total_count: number
        }[]
      }
      category_product_counts: {
        Args: never
        Returns: {
          category_id: string
          product_count: number
        }[]
      }
      create_order: {
        Args: { p_customer: Json; p_items: Json }
        Returns: {
          access_token: string
          order_id: string
          order_number: number
        }[]
      }
      delete_product: {
        Args: { p_product_id: string; p_reason?: string }
        Returns: Json
      }
      duplicate_product: { Args: { p_product_id: string }; Returns: string }
      expire_pending_orders: { Args: never; Returns: number }
      get_build: { Args: { p_code: string }; Returns: Json }
      get_order_by_token: {
        Args: { p_order_id: string; p_token: string }
        Returns: Json
      }
      immutable_unaccent: { Args: { value: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      normalize_place: { Args: { value: string }; Returns: string }
      reorder_product_images: {
        Args: { p_image_ids: string[]; p_product_id: string }
        Returns: undefined
      }
      save_build: { Args: { p_build: Json }; Returns: string }
      search_suggestions: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      set_order_shipping: {
        Args: { p_note?: string; p_order_id: string; p_shipping_cost: number }
        Returns: number
      }
      set_product_specs: {
        Args: { p_product_id: string; p_specs: Json }
        Returns: undefined
      }
      shipping_quote: {
        Args: { p_city: string; p_department: string }
        Returns: {
          max_days: number
          min_days: number
          price: number
        }[]
      }
      touch_admin_seen: { Args: never; Returns: undefined }
      update_order_status: {
        Args: {
          p_note?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      inventory_movement_type:
        | "initial"
        | "restock"
        | "sale"
        | "cancellation"
        | "adjustment"
        | "return"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded"
      product_type: "component" | "prebuilt" | "peripheral"
      spec_data_type: "text" | "number" | "boolean"
      user_role: "customer" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      inventory_movement_type: [
        "initial",
        "restock",
        "sale",
        "cancellation",
        "adjustment",
        "return",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_status: ["unpaid", "pending", "paid", "failed", "refunded"],
      product_type: ["component", "prebuilt", "peripheral"],
      spec_data_type: ["text", "number", "boolean"],
      user_role: ["customer", "admin"],
    },
  },
} as const
