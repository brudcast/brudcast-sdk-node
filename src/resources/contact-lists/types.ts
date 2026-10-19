/**
 * Contact list types. Replies mirror `ContactListTransformer` and
 * `ContactListMembershipTransformer`; requests mirror `app/validators/contact_list.ts`.
 */
import type { OffsetPageParams } from '../../core/pagination';
import type { ContactSummary, ContactTagRecord, MembershipStatus } from '../contacts/types';
import type { ContactChannel, SortOrder, Timestamp } from '../shared';

export type ContactListStatus = 'active' | 'inactive' | 'archived';

export interface ContactListSummary {
  id: string;
  cuid: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: ContactListStatus;
  preferredChannels: ContactChannel[];
  tags: string[];
  isDefault: boolean;
  subscriberCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactList extends ContactListSummary {
  /** Present when the API loaded the list's tags. */
  tagRecords?: ContactTagRecord[];
}

export interface ContactListMember {
  id: string;
  contactId: string;
  contactListId: string;
  status: MembershipStatus;
  subscribedAt: Timestamp | null;
  unsubscribedAt: Timestamp | null;
  unsubscribeReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  contact?: ContactSummary;
}

export interface ContactListCreateParams {
  /** 1 to 255 characters. */
  name: string;
  description?: string;
  status?: ContactListStatus;
  preferredChannels?: ContactChannel[];
  tags?: string[];
  isDefault?: boolean;
}

export type ContactListUpdateParams = Partial<ContactListCreateParams>;

export interface ContactListListParams extends OffsetPageParams {
  search?: string;
  status?: ContactListStatus;
  tags?: string[];
  sortBy?: 'name' | 'subscriberCount' | 'createdAt' | 'updatedAt';
  sortOrder?: SortOrder;
}

export interface ContactListMemberListParams extends OffsetPageParams {
  search?: string;
}

export interface ContactListAddContactsParams {
  /** 1 to 1000 contact ids. */
  contactIds: string[];
}

export interface ContactListRemoveContactsParams extends ContactListAddContactsParams {
  /** Recorded on each membership, up to 255 characters. */
  unsubscribeReason?: string;
}

export interface ContactListStatistics {
  totalLists: number;
  activeLists: number;
  totalSubscribers: number;
}

export interface ContactListBulkOperationParams {
  /** 1 to 1000 list ids. */
  listIds: string[];
  operation: 'activate' | 'deactivate' | 'archive' | 'delete';
}

export interface ContactListBulkOperationResult {
  affectedCount: number;
  operation: string;
}
