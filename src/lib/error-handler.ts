import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Global flag to track connection status
export const isFirestoreOffline = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__firestore_offline__ === true;
};

export function setFirestoreOffline(offline: boolean) {
  if (typeof window !== 'undefined') {
    const wasOffline = (window as any).__firestore_offline__;
    (window as any).__firestore_offline__ = offline;
    if (wasOffline !== offline) {
      window.dispatchEvent(new CustomEvent('firestore-offline-change', { detail: { offline } }));
    }
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error?.code || '';
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.warn(`[Firestore Status Callback] Op: ${operationType}, Path: ${path}, Code: ${errorCode}, Msg: ${errorMessage}`);

  // Connection/network related failure detection
  const isConnectionIssue = 
    errorCode === 'unavailable' || 
    errorCode === 'deadline-exceeded' ||
    errorMessage.includes('Could not reach Cloud Firestore backend') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('Failed to get document because the client is offline') ||
    errorMessage.includes('transport error') ||
    errorMessage.includes('Listen') ||
    errorMessage.includes('WebChannelConnection');

  if (isConnectionIssue) {
    setFirestoreOffline(true);
  }

  // Disable aggressive crashes for read operations. Only throw for mutation/write operations.
  const isWriteOp = 
    operationType === OperationType.CREATE || 
    operationType === OperationType.UPDATE || 
    operationType === OperationType.DELETE || 
    operationType === OperationType.WRITE;

  if (isWriteOp) {
    throw new Error(JSON.stringify(errInfo));
  }
}
