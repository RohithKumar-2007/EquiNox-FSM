export type AssistantRecordType = 'asset' | 'work_order';

export interface AssistantRecord {
  type: AssistantRecordType;
  id: number;
  title: string;
  subtitle?: string;
  status?: string;
}

export interface AssistantPendingAction {
  id: string;
  kind: 'CREATE_WORK_ORDER' | 'CHANGE_WORK_ORDER_STATUS';
  title: string;
  fields: Record<string, string>;
}

export interface AssistantPageContext {
  type: AssistantRecordType;
  id: number;
}

export interface AssistantChatResponse {
  conversationId: string;
  reply: string;
  records: AssistantRecord[];
  pendingActions: AssistantPendingAction[];
}

export interface AssistantActionResult {
  message: string;
  record?: AssistantRecord;
}

export interface AssistantStatus {
  enabled: boolean;
  model: string;
}
