import { User } from 'firebase/auth';
import { AppConfig } from '../types';

/**
 * Robust check for administrative privileges.
 * Combines hardcoded bootstrap emails with dynamic Firestore configuration.
 */
export const checkIsAdmin = (user: User | null, appConfig: AppConfig | null): boolean => {
  if (!user || !user.email) return false;

  const bootstrapAdmins = ['robsonstudio15hd@gmail.com', 'portalseculte@gmail.com'];
  const emailLower = user.email.toLowerCase();
  
  const isBootstrap = bootstrapAdmins.includes(emailLower);
  const isConfigAdmin = appConfig?.adminEmails?.map(e => e.toLowerCase()).includes(emailLower);

  return isBootstrap || !!isConfigAdmin;
};

/**
 * Sanitizes user-provided text to prevent common injection patterns.
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  // Remove potential script tags and basic HTML
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "")
    .replace(/<[^>]+>/gm, "")
    .trim();
};
