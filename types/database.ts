export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string;
          address: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company: string;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'completed';
          budget: number;
          start_date: string | null;
          end_date: string | null;
          client_id: string | null;
          progress: number;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'completed';
          budget?: number;
          start_date?: string | null;
          end_date?: string | null;
          client_id?: string | null;
          progress?: number;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'completed';
          budget?: number;
          start_date?: string | null;
          end_date?: string | null;
          client_id?: string | null;
          progress?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          role: string;
          department: string | null;
          salary: number;
          hire_date: string | null;
          status: 'active' | 'on_leave' | 'terminated';
          emergency_contact: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          role: string;
          department?: string | null;
          salary?: number;
          hire_date?: string | null;
          status?: 'active' | 'on_leave' | 'terminated';
          emergency_contact?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          role?: string;
          department?: string | null;
          salary?: number;
          hire_date?: string | null;
          status?: 'active' | 'on_leave' | 'terminated';
          emergency_contact?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          project_id: string | null;
          client_id: string | null;
          issue_date: string | null;
          due_date: string | null;
          status: 'draft' | 'sent' | 'paid' | 'overdue';
          amount: number;
          line_items: any;
          notes: string | null;
          created_at: string;
          updated_at: string;
          subtotal: number | null;
          tax: number | null;
          total: number | null;
          terms: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          project_id?: string | null;
          client_id?: string | null;
          issue_date?: string | null;
          due_date?: string | null;
          status?: 'draft' | 'sent' | 'paid' | 'overdue';
          amount?: number;
          line_items?: any;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          subtotal?: number | null;
          tax?: number | null;
          total?: number | null;
          terms?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          project_id?: string | null;
          client_id?: string | null;
          issue_date?: string | null;
          due_date?: string | null;
          status?: 'draft' | 'sent' | 'paid' | 'overdue';
          amount?: number;
          line_items?: any;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          subtotal?: number | null;
          tax?: number | null;
          total?: number | null;
          terms?: string | null;
          user_id?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          type: string;
          title: string;
          description: string | null;
          entity_type: string | null;
          entity_id: string | null;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          description?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          description?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          created_at?: string;
          user_id?: string;
        };
      };
      testimonials: {
        Row: {
          id: string;
          client_id: string | null;
          project_id: string | null;
          content: string;
          rating: number | null;
          client_name: string | null;
          client_position: string | null;
          is_featured: boolean;
          is_public: boolean;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          project_id?: string | null;
          content: string;
          rating?: number | null;
          client_name?: string | null;
          client_position?: string | null;
          is_featured?: boolean;
          is_public?: boolean;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          project_id?: string | null;
          content?: string;
          rating?: number | null;
          client_name?: string | null;
          client_position?: string | null;
          is_featured?: boolean;
          is_public?: boolean;
          created_at?: string;
          user_id?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string | null;
          team_member_id: string | null;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          team_member_id?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          team_member_id?: string | null;
          role?: string | null;
          created_at?: string;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string | null;
          description: string;
          quantity: number | null;
          rate: number;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id?: string | null;
          description: string;
          quantity?: number | null;
          rate: number;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string | null;
          description?: string;
          quantity?: number | null;
          rate?: number;
          amount?: number;
          created_at?: string;
        };
      };
      contracts: {
        Row: {
          id: string;
          title: string;
          type: string;
          client_id: string | null;
          project_id: string | null;
          content: string;
          status: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: string;
          client_id?: string | null;
          project_id?: string | null;
          content: string;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: string;
          client_id?: string | null;
          project_id?: string | null;
          content?: string;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          body: string;
          category: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          body: string;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          body?: string;
          category?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      project_files: {
        Row: {
          id: string;
          project_id: string | null;
          file_name: string;
          file_size: number | null;
          file_type: string | null;
          file_url: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          file_name: string;
          file_size?: number | null;
          file_type?: string | null;
          file_url: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          file_name?: string;
          file_size?: number | null;
          file_type?: string | null;
          file_url?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
      };
      contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          type: string;
          status: string;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject: string;
          message: string;
          type?: string;
          status?: string;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          subject?: string;
          message?: string;
          type?: string;
          status?: string;
          created_at?: string;
          user_id?: string | null;
        };
      };
      feedback_submissions: {
        Row: {
          id: string;
          rating: number;
          category: string;
          title: string;
          description: string;
          email: string;
          status: string;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          rating: number;
          category: string;
          title: string;
          description: string;
          email: string;
          status?: string;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          rating?: number;
          category?: string;
          title?: string;
          description?: string;
          email?: string;
          status?: string;
          created_at?: string;
          user_id?: string | null;
        };
      };
    };
    Views: {
      employees: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          role: string;
          department: string | null;
          salary: number;
          hire_date: string | null;
          status: 'active' | 'on_leave' | 'terminated';
          emergency_contact: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
      };
    };
  };
}

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type Employee = Database['public']['Views']['employees']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type Testimonial = Database['public']['Tables']['testimonials']['Row'];
export type ProjectMember = Database['public']['Tables']['project_members']['Row'];
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
export type Contract = Database['public']['Tables']['contracts']['Row'];
export type EmailTemplate = Database['public']['Tables']['email_templates']['Row'];
export type ProjectFile = Database['public']['Tables']['project_files']['Row'];
export type ContactSubmission = Database['public']['Tables']['contact_submissions']['Row'];
export type FeedbackSubmission = Database['public']['Tables']['feedback_submissions']['Row'];