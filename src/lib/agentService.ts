import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { CulturalAgent, AppConfig } from '../types';
import { handleFirestoreError, OperationType } from './error-handler';

const AGENTS_COLLECTION = 'agents';

export const agentService = {
  async getAgent(id: string): Promise<CulturalAgent | null> {
    try {
      const docRef = doc(db, AGENTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const agent = { id: docSnap.id, ...docSnap.data() } as CulturalAgent;
        try {
          localStorage.setItem(`cached_agent_${id}`, JSON.stringify(agent));
        } catch (e) {}
        return agent;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${AGENTS_COLLECTION}/${id}`);
      try {
        const cached = localStorage.getItem(`cached_agent_${id}`);
        if (cached) return JSON.parse(cached) as CulturalAgent;
        
        const cachedAgentsList = localStorage.getItem('cached_agents');
        if (cachedAgentsList) {
          const list = JSON.parse(cachedAgentsList) as CulturalAgent[];
          return list.find(a => a.id === id) || null;
        }
      } catch (e) {}
      return null;
    }
  },

  async getMyAgent(): Promise<CulturalAgent | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const q = query(collection(db, AGENTS_COLLECTION), where("ownerId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const agent = { id: docSnap.id, ...docSnap.data() } as CulturalAgent;
        try {
          localStorage.setItem(`cached_agent_my`, JSON.stringify(agent));
          localStorage.setItem(`cached_agent_${user.uid}`, JSON.stringify(agent));
        } catch (e) {}
        return agent;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, AGENTS_COLLECTION);
      try {
        const cached = localStorage.getItem(`cached_agent_my`);
        if (cached) return JSON.parse(cached) as CulturalAgent;
        
        const cachedWithUid = localStorage.getItem(`cached_agent_${user.uid}`);
        if (cachedWithUid) return JSON.parse(cachedWithUid) as CulturalAgent;
      } catch (e) {}
      return null;
    }
  },

  async getAllAgents(): Promise<CulturalAgent[]> {
    try {
      const querySnapshot = await getDocs(collection(db, AGENTS_COLLECTION));
      const agents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CulturalAgent));
      try {
        localStorage.setItem('cached_agents', JSON.stringify(agents));
      } catch (e) {}
      return agents;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, AGENTS_COLLECTION);
      try {
        const cached = localStorage.getItem('cached_agents');
        if (cached) return JSON.parse(cached) as CulturalAgent[];
      } catch (e) {}
      return [];
    }
  },

  subscribeToAgents(callback: (agents: CulturalAgent[]) => void) {
    try {
      const cached = localStorage.getItem('cached_agents');
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch (e) {}

    const q = collection(db, AGENTS_COLLECTION);
    return onSnapshot(q, (snapshot) => {
      const agents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CulturalAgent));
      try {
        localStorage.setItem('cached_agents', JSON.stringify(agents));
      } catch (e) {}
      callback(agents);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, AGENTS_COLLECTION);
      try {
        const cached = localStorage.getItem('cached_agents');
        if (cached) {
          callback(JSON.parse(cached));
        } else {
          callback([]);
        }
      } catch (e) {
        callback([]);
      }
    });
  },

  async createAgent(agent: Omit<CulturalAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("User must be authenticated");
    
    try {
      const agentId = user.uid; // Use user UID as agent ID for simple one-to-one
      const docRef = doc(db, AGENTS_COLLECTION, agentId);
      const { id, ownerId, createdAt, updatedAt, ...cleanAgent } = agent as any;
      const data = {
        ...cleanAgent,
        id: agentId,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, data);
      try {
        localStorage.removeItem(`deleted_agent_${agentId}`);
        localStorage.setItem(`cached_agent_my`, JSON.stringify(data));
        localStorage.setItem(`cached_agent_${agentId}`, JSON.stringify(data));
      } catch (e) {}
      return agentId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, AGENTS_COLLECTION);
      return "";
    }
  },

  async updateAgent(id: string, agent: Partial<CulturalAgent>): Promise<void> {
    try {
      const docRef = doc(db, AGENTS_COLLECTION, id);
      const { id: _, ownerId, createdAt, updatedAt, ...cleanAgent } = agent as any;
      await updateDoc(docRef, {
        ...cleanAgent,
        updatedAt: serverTimestamp(),
      });
      // Try to update local cached version
      try {
        const cachedStr = localStorage.getItem(`cached_agent_${id}`);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          const updated = { ...cached, ...agent };
          localStorage.setItem(`cached_agent_${id}`, JSON.stringify(updated));
          if (auth.currentUser?.uid === id) {
            localStorage.setItem(`cached_agent_my`, JSON.stringify(updated));
          }
        }
      } catch (e) {}
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${AGENTS_COLLECTION}/${id}`);
    }
  },

  async deleteAgent(id: string): Promise<void> {
    try {
      const docRef = doc(db, AGENTS_COLLECTION, id);
      await deleteDoc(docRef);
      try {
        localStorage.setItem(`deleted_agent_${id}`, 'true');
        localStorage.removeItem(`cached_agent_${id}`);
        localStorage.removeItem(`cached_agent_my`);
      } catch (e) {}
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${AGENTS_COLLECTION}/${id}`);
    }
  },

  async getAppConfig(): Promise<AppConfig | null> {
    try {
      const docSnap = await getDoc(doc(db, 'config', 'app'));
      if (docSnap.exists()) {
        const cfg = docSnap.data() as AppConfig;
        try {
          localStorage.setItem('cached_app_config', JSON.stringify(cfg));
        } catch (e) {}
        return cfg;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'config/app');
      try {
        const cached = localStorage.getItem('cached_app_config');
        if (cached) return JSON.parse(cached) as AppConfig;
      } catch (e) {}
      return null;
    }
  },

  async updateAppConfig(data: Partial<AppConfig>): Promise<void> {
    try {
      await setDoc(doc(db, 'config', 'app'), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/app');
    }
  },
  
  subscribeToAppConfig(callback: (config: AppConfig | null) => void) {
    try {
      const cached = localStorage.getItem('cached_app_config');
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch (e) {}

    const docRef = doc(db, 'config', 'app');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const cfg = snapshot.data() as AppConfig;
        try {
          localStorage.setItem('cached_app_config', JSON.stringify(cfg));
        } catch (e) {}
        callback(cfg);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/app');
      try {
        const cached = localStorage.getItem('cached_app_config');
        if (cached) {
          callback(JSON.parse(cached));
        } else {
          callback(null);
        }
      } catch (e) {
        callback(null);
      }
    });
  }
};
