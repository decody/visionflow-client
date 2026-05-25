export type PartnershipInquiryCompanySize =
  | '1'
  | '2-10'
  | '11-50'
  | '50+';

export type PartnershipInquiryType =
  | 'outsourcing'
  | 'reseller'
  | 'tech_partner'
  | 'content_partner'
  | 'etc';

export type PartnershipInquiryStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'rejected';

export interface IPartnershipInquiry {
  id: string;
  company_name: string;
  company_size: PartnershipInquiryCompanySize;
  contact_name: string;
  contact_position: string;
  contact_email: string;
  contact_phone?: string | null;
  partnership_type: PartnershipInquiryType;
  proposal_content: string;
  company_url?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  status: PartnershipInquiryStatus;
  admin_memo?: string | null;
  created_at: string;
  updated_at: string;
}

export type IPartnershipInquiryListResponse =
  IPartnershipInquiry[];
