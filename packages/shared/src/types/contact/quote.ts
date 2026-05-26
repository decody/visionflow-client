export type QuoteInquiryStatus =
  | 'pending'
  | 'reviewing'
  | 'completed'
  | 'rejected';

export interface IQuoteInquiry {
  id: number;
  service_categories: string[];
  project_scale: string;
  preferred_start_date: string;
  project_description: string;
  reference_urls: string[];
  attached_files: string[];
  company_name: string;
  contact_name: string;
  position?: string | null;
  email: string;
  phone?: string | null;
  preferred_contact_methods: string[];
  privacy_agreed: boolean;
  privacy_agreed_at?: string | null;
  marketing_agreed: boolean;
  marketing_agreed_at?: string | null;
  status: QuoteInquiryStatus;
  admin_memo?: string | null;
  assigned_admin_id?: string | null;
  contacted_at?: string | null;
  completed_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
}

export type IQuoteInquiryListResponse = IQuoteInquiry[];
