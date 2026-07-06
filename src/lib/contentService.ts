import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './error-handler';

export const contentService = {
  async saveContent(type: string, data: any, userId: string) {
    const collectionName = this.getCollectionName(type);
    const id = data.id || doc(collection(db, collectionName)).id;
    const isNew = !data.id;
    
    try {
      const docRef = doc(db, collectionName, id);
      
      const payload = {
        ...data,
        id,
        ownerId: userId,
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        payload.createdAt = serverTimestamp();
        await setDoc(docRef, payload);
      } else {
        const { createdAt, ownerId, ...updateData } = payload;
        await updateDoc(docRef, updateData);
      }
      
      return id;
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, `${collectionName}/${id}`);
    }
  },

  async deleteContent(type: string, id: string) {
    const collectionName = this.getCollectionName(type);
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  },

  async getMyContent(type: string, userId: string) {
    const collectionName = this.getCollectionName(type);
    try {
      const q = query(
        collection(db, collectionName), 
        where('ownerId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      try {
        localStorage.setItem(`cached_my_content_${type}_${userId}`, JSON.stringify(data));
      } catch (e) {}
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      try {
        const cached = localStorage.getItem(`cached_my_content_${type}_${userId}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
      return [];
    }
  },

  async getAllContent(type: string) {
    const collectionName = this.getCollectionName(type);
    try {
      const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      try {
        localStorage.setItem(`cached_all_content_${type}`, JSON.stringify(data));
      } catch (e) {}
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      try {
        const cached = localStorage.getItem(`cached_all_content_${type}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
      return [];
    }
  },

  getCollectionName(type: string) {
    switch (type) {
      case 'space': return 'spaces';
      case 'event': return 'events';
      case 'opportunity': return 'opportunities';
      case 'project': return 'projects';
      case 'registration': return 'opportunity_registrations';
      default: throw new Error(`Unknown content type: ${type}`);
    }
  },

  async saveOpportunityRegistration(data: any, userId: string) {
    const isUpdate = !!data.id;
    const id = data.id || doc(collection(db, 'opportunity_registrations')).id;
    try {
      const regNumber = data.registrationNumber || `PA-${Math.floor(Math.random() * 1000000000)}`;
      const payload = {
        ...data,
        id,
        userId: data.userId || userId,
        registrationNumber: regNumber,
        status: data.status || 'submitted',
        updatedAt: serverTimestamp(),
      };
      
      if (!isUpdate) {
        payload.createdAt = serverTimestamp();
        await setDoc(doc(db, 'opportunity_registrations', id), payload);
      } else {
        const { createdAt, ...updateData } = payload;
        await updateDoc(doc(db, 'opportunity_registrations', id), updateData);
      }
      return id;
    } catch (error) {
      handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, `opportunity_registrations/${id}`);
    }
  },

  async getAllRegistrations() {
    try {
      const q = query(
        collection(db, 'opportunity_registrations'),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      try {
        localStorage.setItem('cached_opportunity_registrations', JSON.stringify(data));
      } catch (e) {}
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'opportunity_registrations');
      try {
        const cached = localStorage.getItem('cached_opportunity_registrations');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
      return [];
    }
  },

  async getUserRegistrations(userId: string) {
    try {
      const q = query(
        collection(db, 'opportunity_registrations'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      try {
        localStorage.setItem(`cached_user_registrations_${userId}`, JSON.stringify(data));
      } catch (e) {}
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'opportunity_registrations');
      try {
        const cached = localStorage.getItem(`cached_user_registrations_${userId}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
      return [];
    }
  },

  async getRegistrationsForOpportunities(opportunityIds: string[]) {
    if (!opportunityIds || opportunityIds.length === 0) return [];
    try {
      const results: any[] = [];
      // Chunk opportunityIds in groups of 30 because Firestore 'in' query supports up to 30 items
      for (let i = 0; i < opportunityIds.length; i += 30) {
        const chunk = opportunityIds.slice(i, i + 30);
        const q = query(
          collection(db, 'opportunity_registrations'),
          where('opportunityId', 'in', chunk),
          orderBy('updatedAt', 'desc')
        );
        const snap = await getDocs(q);
        results.push(...snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      return results;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'opportunity_registrations');
      return [];
    }
  },

  async getContentById(type: string, id: string) {
    const collectionName = this.getCollectionName(type);
    try {
      const docSnap = await getDoc(doc(db, collectionName, id));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        try {
          localStorage.setItem(`cached_content_item_${type}_${id}`, JSON.stringify(data));
        } catch (e) {}
        return data;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
      try {
        const cached = localStorage.getItem(`cached_content_item_${type}_${id}`);
        if (cached) return JSON.parse(cached);
        
        // Fall back to searching in cached all list
        const cachedAllList = localStorage.getItem(`cached_all_content_${type}`);
        if (cachedAllList) {
          const list = JSON.parse(cachedAllList) as any[];
          return list.find(item => item.id === id) || null;
        }
      } catch (e) {}
      return null;
    }
  }
};
