import type { APIPromise } from '../../core/api-promise';
import type { OffsetPage, OffsetPageParams, PagePromise } from '../../core/pagination';
import { APIResource } from '../../core/resource';
import type { RequestOptions } from '../../core/transport';
import type {
  CampaignBrief,
  CampaignEditorMode,
  PushPriority,
  WhatsappCategory,
} from '../campaigns/types';
import type {
  InAppDesign,
  InAppDisplayRules,
  InAppFormat,
  InAppInboxSettings,
  InAppTrigger,
} from '../content';
import type { CampaignChannel, Timestamp } from '../shared';

/** Every campaign channel but voice. */
export type TemplateChannel = Exclude<CampaignChannel, 'voice'>;

export interface TemplatePlaceholder {
  id: string;
  templateId: string;
  position: number;
  key: string;
  /** `static` takes a value when the template is used; `contact_field` reads the contact. */
  kind: 'static' | 'contact_field';
  label: string;
  defaultValue: string | null;
  isRequired: boolean;
  contactCustomFieldId: string | null;
}

export interface TemplateEmailContent {
  subject: string;
  previewText: string | null;
  htmlContent: string | null;
  plainTextContent: string | null;
  editorMode: CampaignEditorMode;
  builderData: Record<string, unknown> | null;
}

export interface TemplateWhatsappContent {
  whatsappTemplateId: string | null;
  templateName: string;
  languageCode: string;
  category: WhatsappCategory;
  variables: Record<string, string> | null;
  headerMediaUrl: string | null;
  bodyPreview: string | null;
}

export interface TemplatePushContent {
  title: string;
  body: string;
  imageUrl: string | null;
  clickUrl: string | null;
  data: Record<string, string> | null;
  ttlSeconds: number | null;
  priority: PushPriority;
}

export interface TemplateInAppContent {
  format: InAppFormat;
  design: InAppDesign;
  editorMode: CampaignEditorMode;
  trigger: InAppTrigger;
  displayRules: InAppDisplayRules;
  inbox: InAppInboxSettings;
}

type Stored<T> = T & { id: string; templateId: string };

/**
 * A reusable message. Mirrors `TemplateTransformer`; the placeholders and contents are present
 * when the API loaded them.
 */
export interface Template {
  id: string;
  organizationId: string;
  name: string;
  channels: TemplateChannel[];
  brief: CampaignBrief | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  placeholders?: TemplatePlaceholder[];
  emailContent?: Stored<TemplateEmailContent> | null;
  smsContent?: Stored<{ body: string }> | null;
  whatsappContent?: Stored<TemplateWhatsappContent> | null;
  pushContent?: Stored<TemplatePushContent> | null;
  inAppContent?:
    | (Stored<TemplateInAppContent> & { createdAt: Timestamp | null; updatedAt: Timestamp | null })
    | null;
}

export interface TemplatePlaceholderParams {
  /** Lowercase letters, digits and `_`, starting with a letter; up to 64 characters. */
  key: string;
  kind: 'static' | 'contact_field';
  label: string;
  defaultValue?: string | null;
  isRequired?: boolean;
  contactCustomFieldId?: string | null;
}

type Optional<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] };

export interface TemplateCreateParams {
  /** 1 to 255 characters. */
  name: string;
  channels: TemplateChannel[];
  placeholders?: TemplatePlaceholderParams[];
  brief?: CampaignBrief | null;
  emailContent?: Optional<
    TemplateEmailContent,
    'previewText' | 'htmlContent' | 'plainTextContent' | 'builderData'
  >;
  smsContent?: { body: string };
  /** Either `whatsappTemplateId`, or `templateName` with `category`. */
  whatsappContent?: Partial<TemplateWhatsappContent>;
  pushContent?: Optional<
    TemplatePushContent,
    'imageUrl' | 'clickUrl' | 'data' | 'ttlSeconds' | 'priority'
  >;
  inAppContent?: Partial<Omit<TemplateInAppContent, 'editorMode'>> & { editorMode?: 'visual' };
}

/**
 * The fields to change; a content set to `null` removes that channel's content, and
 * `placeholders` replaces every placeholder
 */
export type TemplateUpdateParams = {
  [K in keyof TemplateCreateParams]?: K extends `${string}Content`
    ? TemplateCreateParams[K] | null
    : TemplateCreateParams[K];
};

export interface TemplateListParams extends OffsetPageParams {
  search?: string;
  channel?: CampaignChannel;
}

/**
 * A template's content with its placeholders filled in
 */
export interface ResolvedTemplateContent {
  channels: TemplateChannel[];
  emailContent?: TemplateEmailContent;
  smsContent?: { body: string };
  whatsappContent?: TemplateWhatsappContent;
  pushContent?: TemplatePushContent;
  inAppContent?: TemplateInAppContent;
}

/**
 * Message templates, reusable across campaigns
 *
 * Requires the `templates:read` scope to read and `templates:write` to change. `resolve` is a
 * `POST` and needs `templates:write`.
 */
export class Templates extends APIResource {
  /**
   * Create a template
   *
   * @param params - The template, its channels, placeholders and content
   * @param options - Request options
   * @returns The new template
   */
  create(params: TemplateCreateParams, options?: RequestOptions): APIPromise<Template> {
    return this.request('POST', '/templates', { body: params, options });
  }

  /**
   * Fetch a template with its placeholders and content
   *
   * @param templateId - The template
   * @param options - Request options
   * @returns The template
   */
  retrieve(templateId: string, options?: RequestOptions): APIPromise<Template> {
    return this.request('GET', this.path`/templates/${templateId}`, { options });
  }

  /**
   * Change a template
   *
   * @param templateId - The template
   * @param params - The fields to change
   * @param options - Request options
   * @returns The updated template
   */
  update(
    templateId: string,
    params: TemplateUpdateParams,
    options?: RequestOptions,
  ): APIPromise<Template> {
    return this.request('PATCH', this.path`/templates/${templateId}`, { body: params, options });
  }

  /**
   * List templates
   *
   * @param params - Search, channel and page
   * @param options - Request options
   * @returns The first page; iterate it with `for await` for every template
   */
  list(
    params: TemplateListParams = {},
    options?: RequestOptions,
  ): PagePromise<OffsetPage<Template>, Template> {
    return this.offsetList('/templates', { query: params, options });
  }

  /**
   * Delete a template
   *
   * @param templateId - The template
   * @param options - Request options
   * @returns A promise that resolves once the template is deleted
   */
  delete(templateId: string, options?: RequestOptions): APIPromise<void> {
    return this.requestVoid('DELETE', this.path`/templates/${templateId}`, { options });
  }

  /**
   * Copy a template
   *
   * @param templateId - The template
   * @param options - Request options
   * @returns The copy
   */
  duplicate(templateId: string, options?: RequestOptions): APIPromise<Template> {
    return this.request('POST', this.path`/templates/${templateId}/duplicate`, { options });
  }

  /**
   * Fill a template's `static` placeholders and return its content, ready for a campaign
   *
   * @param templateId - The template
   * @param params - A value per placeholder key
   * @param options - Request options
   * @returns The content with the placeholders replaced
   */
  resolve(
    templateId: string,
    params: { values?: Record<string, string> } = {},
    options?: RequestOptions,
  ): APIPromise<ResolvedTemplateContent> {
    return this.request('POST', this.path`/templates/${templateId}/resolve`, {
      body: params,
      options,
    });
  }
}
