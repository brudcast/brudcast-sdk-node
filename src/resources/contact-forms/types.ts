/**
 * Contact form types. Replies mirror `ContactFormTransformer` and the form field, submission,
 * upload and placement transformers, with `app/types/contact_form.ts` and
 * `app/types/contact_form_placement.ts`; requests mirror `app/validators/contact_form.ts` and
 * `app/validators/contact_form_placement.ts`.
 */
import type { OffsetPageParams } from '../../core/pagination';
import type { ContactListSummary } from '../contact-lists/types';
import type { SortOrder, Timestamp } from '../shared';

export type ContactFormStatus = 'draft' | 'published' | 'paused' | 'archived';
/** `signup` collects contacts; `page` is a questionnaire whose answers are kept. */
export type ContactFormKind = 'signup' | 'page';
export type ContactFormDelivery = 'hosted' | 'embedded' | 'popup';
export type ContactFormLanguage = 'en' | 'fr' | 'es' | 'pt' | 'de' | 'ar';
export type ContactFormNotifyMode = 'off' | 'each' | 'daily_digest';

/**
 * The short form of a form that other replies embed. Mirrors `ContactFormTransformer.toSummary`.
 */
export interface ContactFormSummary {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  status: ContactFormStatus;
  kind: ContactFormKind;
}

export interface ContactFormTheme {
  logoUrl?: string;
  coverImageUrl?: string;
  /** `#RRGGBB`. */
  accentColor?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  fontFamily?:
    | 'system'
    | 'inter'
    | 'dm_sans'
    | 'space_grotesk'
    | 'lora'
    | 'merriweather'
    | 'playfair_display'
    | 'source_serif';
  buttonShape?: 'square' | 'rounded' | 'pill';
  logoPlacement?: 'left' | 'center';
  layout?: 'centered' | 'split_image';
  hideBranding?: boolean;
}

export type ContactFormOutcome =
  'thanks' | 'check_inbox' | 'confirmed' | 'already' | 'declined' | 'expired';

/** The heading and body shown for each outcome of a submission. */
export type ContactFormOutcomeCopy = Partial<
  Record<ContactFormOutcome, { heading?: string; body?: string }>
>;

export type ContactFormFieldTarget =
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'custom_field'
  | 'consent'
  | 'sms_consent'
  | 'whatsapp_consent'
  | 'hidden';

export type ContactFormInputType =
  | 'short_answer'
  | 'paragraph'
  | 'email'
  | 'phone'
  | 'number'
  | 'url'
  | 'date'
  | 'time'
  | 'birthday'
  | 'address'
  | 'country'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'linear_scale'
  | 'rating'
  | 'multiple_choice_grid'
  | 'checkbox_grid'
  | 'file_upload'
  | 'consent_checkbox'
  | 'hidden'
  | 'section_break'
  | 'title_and_description'
  | 'image'
  | 'video';

export type ContactFormFileType =
  'image' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'audio' | 'video' | 'archive';

export interface ContactFormFieldPresentation {
  ratingIcon?: 'star' | 'heart' | 'thumb';
  timeFormat?: 'time_of_day' | 'duration';
  lowLabel?: string;
  highLabel?: string;
  mediaUrl?: string;
  altText?: string;
  dateOrder?: 'month_day' | 'day_month';
  /** The query parameter that prefills the field. */
  prefillParam?: string;
}

export interface ContactFormFieldValidation {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  minSelections?: number;
  maxSelections?: number;
  pattern?: 'letters_only' | 'digits_only' | 'alphanumeric' | 'no_links';
  maxFiles?: number;
  maxFileBytes?: number;
  allowedFileTypes?: ContactFormFileType[];
}

/**
 * A field of a form. Mirrors `ContactFormFieldTransformer`.
 */
export interface ContactFormField {
  id: string;
  contactFormId: string;
  position: number;
  /** The key a submission's `values` uses for this field. */
  key: string;
  /** The contact attribute the answer is written to. */
  target: ContactFormFieldTarget | null;
  inputType: ContactFormInputType;
  contactCustomFieldId: string | null;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options: string[] | null;
  /** The rows of a grid question. */
  rows: string[] | null;
  presentation: ContactFormFieldPresentation | null;
  validation: ContactFormFieldValidation | null;
  /** Tag ids to apply for each option chosen. */
  optionTags: Record<string, string[]> | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A form. Mirrors `ContactFormTransformer`.
 */
export interface ContactForm extends ContactFormSummary {
  organizationId: string;
  description: string | null;
  delivery: ContactFormDelivery;
  contactListId: string | null;
  doubleOptIn: boolean;
  sendWelcomeEmail: boolean;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  sendingDomainId: string | null;
  theme: ContactFormTheme | null;
  tagIds: string[] | null;
  minSubmitSeconds: number;
  turnstileEnabled: boolean;
  oneSubmissionPerEmail: boolean;
  hourlySubmissionCap: number;
  responseCap: number | null;
  closingMessage: string | null;
  redirectUrl: string | null;
  submitLabel: string;
  confirmationSubject: string | null;
  welcomeSubject: string | null;
  successMessage: string | null;
  checkInboxMessage: string | null;
  confirmationBody: string | null;
  welcomeBody: string | null;
  outcomeCopy: ContactFormOutcomeCopy | null;
  notifyEmails: string[] | null;
  notifyMode: ContactFormNotifyMode;
  language: ContactFormLanguage;
  publishedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  contactList?: ContactListSummary;
  fields?: ContactFormField[];
}

export interface ContactFormCreateParams {
  /** 1 to 255 characters. */
  name: string;
  /** Lowercase letters and digits separated by `-`; generated from the name when omitted. */
  slug?: string;
  description?: string | null;
  kind?: ContactFormKind;
  delivery?: ContactFormDelivery;
  contactListId?: string;
  doubleOptIn?: boolean;
}

export interface ContactFormUpdateParams extends Omit<
  ContactFormCreateParams,
  'name' | 'contactListId'
> {
  name?: string;
  contactListId?: string | null;
  sendWelcomeEmail?: boolean;
  fromEmail?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  theme?: { [K in keyof ContactFormTheme]?: ContactFormTheme[K] | null };
  /** Up to 50 tags applied to every contact the form creates. */
  tagIds?: string[];
  /** 0 to 120. */
  minSubmitSeconds?: number;
  turnstileEnabled?: boolean;
  oneSubmissionPerEmail?: boolean;
  hourlySubmissionCap?: number;
  responseCap?: number | null;
  closingMessage?: string | null;
  redirectUrl?: string | null;
  submitLabel?: string;
  confirmationSubject?: string | null;
  welcomeSubject?: string | null;
  successMessage?: string | null;
  checkInboxMessage?: string | null;
  confirmationBody?: string | null;
  welcomeBody?: string | null;
  outcomeCopy?: ContactFormOutcomeCopy | null;
  notifyEmails?: string[] | null;
  notifyMode?: ContactFormNotifyMode;
  language?: ContactFormLanguage;
}

export interface ContactFormListParams extends OffsetPageParams {
  search?: string;
  status?: ContactFormStatus;
  kind?: ContactFormKind;
  delivery?: ContactFormDelivery;
  contactListId?: string;
  sortBy?: 'name' | 'status' | 'createdAt' | 'updatedAt';
  sortOrder?: SortOrder;
}

export interface ContactFormFieldInput {
  /** An existing field's id, to keep its answers linked; omit for a new field. */
  id?: string;
  key?: string;
  target?: ContactFormFieldTarget | null;
  inputType?: ContactFormInputType;
  contactCustomFieldId?: string | null;
  label: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired?: boolean;
  defaultValue?: string | null;
  options?: string[] | null;
  rows?: string[] | null;
  presentation?: ContactFormFieldPresentation | null;
  validation?: ContactFormFieldValidation | null;
  optionTags?: Record<string, string[]> | null;
}

export interface ContactFormStatistics {
  totalForms: number;
  publishedForms: number;
  submissionsLast30Days: number;
  confirmationsLast30Days: number;
  confirmationRate: number;
}

export interface ContactFormAnalyticsPoint {
  date: string;
  views: number;
  submissions: number;
  confirmations: number;
  rejections: number;
}

export interface ContactFormAnalytics {
  totals: Omit<ContactFormAnalyticsPoint, 'date'>;
  confirmationRate: number;
  points: ContactFormAnalyticsPoint[];
}

export interface ContactFormReadiness {
  publishable: boolean;
  checks: {
    /** Such as `FORM_NO_LIST` or `FORM_NO_VERIFIED_SENDING_DOMAIN`. */
    code: string;
    level: 'pass' | 'warn' | 'block';
    message: string;
  }[];
}

/**
 * What the form submission API accepts for one form. Mirrors `ContactFormApiSchemaTransformer`.
 */
export interface ContactFormSchema {
  id: string;
  name: string;
  kind: ContactFormKind;
  status: ContactFormStatus;
  doubleOptIn: boolean;
  /** Whether the organization has an API key that can submit. */
  hasSubmissionKey: boolean;
  fields: {
    key: string;
    id: string;
    label: string;
    inputType: ContactFormInputType;
    target: ContactFormFieldTarget | null;
    isRequired: boolean;
    options: string[] | null;
    rows: string[] | null;
    validation: ContactFormFieldValidation | null;
    /** False for file uploads, which the API cannot submit. */
    acceptsApiAnswers: boolean;
  }[];
}

export type ContactFormSubmissionStatus =
  'pending' | 'confirmed' | 'received' | 'expired' | 'rejected' | 'failed';

export type ContactFormRejectionReason =
  | 'honeypot'
  | 'too_fast'
  | 'rate_limited'
  | 'bot_check_failed'
  | 'suppressed'
  | 'duplicate'
  | 'quota_exceeded'
  | 'response_cap_reached'
  | 'form_unavailable'
  | 'sending_blocked';

/** One answer: text, a list of choices, or a grid of row to choice(s). */
export type ContactFormAnswer = string | string[] | Record<string, string | string[]>;

export interface ContactFormUpload {
  id: string;
  contactFormFieldId: string | null;
  contactFormSubmissionId: string | null;
  fileName: string;
  contentType: string;
  byteSize: number;
  createdAt: Timestamp;
}

/**
 * A submission. Mirrors `ContactFormSubmissionTransformer`; `payload` and `attachments` are
 * present for `page` forms.
 */
export interface ContactFormSubmission {
  id: string;
  contactFormId: string;
  organizationId: string;
  status: ContactFormSubmissionStatus;
  email: string | null;
  contactId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  ingress: 'hosted' | 'api' | 'html';
  apiKeyId: string | null;
  apiKeyName: string | null;
  botCheck: 'passed' | 'failed' | 'skipped' | 'unavailable';
  honeypotTripped: boolean;
  elapsedMs: number | null;
  rejectionReason: ContactFormRejectionReason | null;
  confirmationSentAt: Timestamp | null;
  confirmationSendFailures: number;
  confirmedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  payload?: Record<string, ContactFormAnswer> | null;
  attachments?: ContactFormUpload[];
}

export interface ContactFormSubmissionCreateParams {
  /** An answer per field key; see `contactForms.schema` for the keys. */
  values: Record<string, ContactFormAnswer>;
  /** The person's own request, recorded with their consent. */
  context?: { ipAddress?: string; userAgent?: string; referrer?: string };
}

export interface ContactFormSubmissionListParams extends OffsetPageParams {
  search?: string;
  status?: ContactFormSubmissionStatus;
  ingress?: 'hosted' | 'api' | 'html';
  sortOrder?: SortOrder;
}

export type PlacementStatus = 'draft' | 'live' | 'paused';
export type PopupFormat = 'modal' | 'slide_in' | 'banner_top' | 'banner_bottom' | 'fullscreen';

export interface PlacementDesign {
  imageUrl?: string;
  imageSide?: 'left' | 'right' | 'top';
  teaserText?: string;
  showTeaser?: boolean;
}

export interface PlacementTrigger {
  type: 'delay' | 'scroll' | 'exit_intent' | 'inactivity' | 'click';
  delaySeconds?: number;
  scrollPercent?: number;
  idleSeconds?: number;
  /** The CSS selector a `click` trigger listens on. */
  selector?: string;
}

export interface PlacementPageRule {
  match: 'equals' | 'contains' | 'starts_with';
  value: string;
}

export interface PlacementTargeting {
  visitors: 'all' | 'new' | 'returning';
  devices: ('desktop' | 'tablet' | 'mobile')[];
  pages: { include: PlacementPageRule[]; exclude: PlacementPageRule[] };
  utmSource?: string;
  referrerContains?: string;
  /** ISO 3166-1 alpha-2. */
  countries?: string[];
}

export interface PlacementFrequency {
  hideAfterSubmit: boolean;
  showAgainAfterDays: number;
  maxPerSession: number;
}

/**
 * Where and when a popup form shows on a website. Mirrors `ContactFormPlacementTransformer`.
 */
export interface ContactFormPlacement {
  id: string;
  organizationId: string;
  contactFormId: string;
  websiteId: string;
  name: string;
  status: PlacementStatus;
  format: PopupFormat;
  position: 'bottom_right' | 'bottom_left' | null;
  design: PlacementDesign | null;
  trigger: PlacementTrigger;
  targeting: PlacementTargeting;
  frequency: PlacementFrequency;
  /** The placement this one is an A/B variant of. */
  variantOf: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  website?: { id: string; name: string; installVerifiedAt: Timestamp | null };
  stats?: { impressions: number; submissions: number };
}

export interface ContactFormPlacementCreateParams {
  /** 1 to 120 characters. */
  name: string;
  websiteId: string;
  format?: PopupFormat;
  position?: 'bottom_right' | 'bottom_left' | null;
  design?: PlacementDesign | null;
  trigger?: PlacementTrigger;
  targeting?: Partial<Omit<PlacementTargeting, 'pages'>> & {
    pages?: { include?: PlacementPageRule[]; exclude?: PlacementPageRule[] };
  };
  frequency?: Partial<PlacementFrequency>;
}

export type ContactFormPlacementUpdateParams = Partial<ContactFormPlacementCreateParams>;

export interface ContactFormPlacementAnalytics {
  totals: { impressions: number; submissions: number; closes: number };
  conversionRate: number;
  points: { date: string; impressions: number; submissions: number; closes: number }[];
}
