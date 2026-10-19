/**
 * The structured content campaigns, templates and in-app messages carry: in-app designs and
 * their trigger and display rules (mirroring `app/types/in_app.ts`), and voice call flows
 * (mirroring `app/types/voice.ts`).
 */

export type InAppFormat = 'modal' | 'banner' | 'fullscreen' | 'inbox_only';
export type InAppAudience = 'recipients' | 'all_app_users';
export type InAppPosition = 'top' | 'center' | 'bottom';
export type InAppPriority = 'low' | 'normal' | 'high';

export interface InAppAction {
  type: 'deeplink' | 'url' | 'dismiss' | 'custom_event' | 'request_push_permission';
  /** The link, URL or event name; null for `dismiss` and `request_push_permission`. */
  value: string | null;
  /** Where a `url` opens. */
  target: 'in_app' | 'browser' | null;
}

export interface InAppTextBlock {
  id: string;
  type: 'text';
  role: 'title' | 'body' | 'caption';
  text: string;
  style: {
    size: number | null;
    weight: 'regular' | 'medium' | 'bold';
    align: 'start' | 'center' | 'end';
    /** `#RRGGBB` or `#RRGGBBAA`. */
    color: string | null;
    darkColor: string | null;
  };
}

export interface InAppImageBlock {
  id: string;
  type: 'image';
  url: string;
  /** Width over height, from 0.25 to 4. */
  aspectRatio: number;
  alt: string;
  cornerRadius: number | null;
}

export interface InAppButtonBlock {
  id: string;
  type: 'button';
  label: string;
  action: InAppAction;
  style: {
    variant: 'primary' | 'secondary' | 'text';
    background: string | null;
    textColor: string | null;
    darkBackground: string | null;
    darkTextColor: string | null;
  };
}

export interface InAppSpacerBlock {
  id: string;
  type: 'spacer';
  height: number;
}

export interface InAppDividerBlock {
  id: string;
  type: 'divider';
  color: string | null;
  thickness: number;
}

export interface InAppColumnsBlock {
  id: string;
  type: 'columns';
  /** Up to two text, image or button blocks side by side. */
  children: (InAppTextBlock | InAppImageBlock | InAppButtonBlock)[];
}

export type InAppBlock =
  | InAppTextBlock
  | InAppImageBlock
  | InAppButtonBlock
  | InAppSpacerBlock
  | InAppDividerBlock
  | InAppColumnsBlock;

/**
 * What an in-app message looks like
 */
export interface InAppDesign {
  /** Currently 1. */
  schemaVersion: number;
  format: InAppFormat;
  layout: {
    position: InAppPosition;
    dismissible: boolean;
    overlay: { color: string; opacity: number };
    background: { color: string; imageUrl: string | null };
    cornerRadius: number;
    padding: number;
    darkMode: { backgroundColor: string | null };
    autoDismissSeconds: number | null;
    bannerAction: InAppAction | null;
  };
  blocks: InAppBlock[];
}

/**
 * When an in-app message shows
 */
export interface InAppTrigger {
  type: 'on_session' | 'event' | 'screen';
  eventName: string | null;
  screenName: string | null;
  /** Up to five conditions on the event's properties. */
  filters: {
    property: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'exists';
    value: string | number | boolean | null;
  }[];
}

/**
 * How often and how soon an in-app message shows
 */
export interface InAppDisplayRules {
  /** Up to 50. */
  maxImpressions: number;
  /** Up to 600. */
  delaySeconds: number;
  priority: InAppPriority;
}

/**
 * Whether an in-app message is also kept in the app's inbox
 */
export interface InAppInboxSettings {
  addToInbox: boolean;
  title: string;
  preview: string;
  thumbnailUrl: string | null;
  /** Up to 365. */
  expiresInDays: number;
}

export interface VoiceSpeech {
  segments: ({ type: 'text'; text: string } | { type: 'pause'; durationMs: number })[];
  /** Text to say for a merge tag the contact has no value for, by tag. */
  fallbacks: Record<string, string>;
  voice: string | null;
  /** For example `en-NG`. */
  language: string;
}

export type VoicePrompt =
  { type: 'speech'; speech: VoiceSpeech } | { type: 'audio'; mediaId: string | null };

export interface VoiceQuestionBlock {
  id: string;
  type: 'question';
  preset: 'rsvp' | 'rating_10' | 'rating_5' | 'yes_no' | 'custom_menu' | 'number_entry';
  prompt: VoicePrompt;
  /** The menu choices, up to nine. */
  options: { digits: string; value: string; label: string }[];
  range: { min: number; max: number } | null;
  minDigits: number;
  maxDigits: number;
  finishOnKey: '#' | '*' | null;
  /** 5 to 20. */
  timeoutSeconds: number;
  /** 0 to 3. */
  retries: number;
  retryPrompt: VoiceSpeech | null;
  confirmation: VoiceSpeech | null;
  /** Lowercase letters, digits and `_`, starting with a letter. */
  responseKey: string;
  writeBack: { customFieldKey: string | null; tagPrefix: string | null };
  /** What happens next for an answer: a value, `valid` or `no_response`. */
  branches: { match: string; blocks: VoiceBlock[] }[];
}

export type VoiceBlock =
  | { id: string; type: 'speak'; speech: VoiceSpeech }
  | { id: string; type: 'play_audio'; mediaId: string | null }
  | { id: string; type: 'end_call'; goodbye: VoicePrompt | null }
  | VoiceQuestionBlock;

/**
 * What a voice call says and asks
 */
export interface VoiceFlow {
  /** Currently 1. */
  schemaVersion: number;
  /** Up to 50 blocks, nested at most three deep. */
  blocks: VoiceBlock[];
}
