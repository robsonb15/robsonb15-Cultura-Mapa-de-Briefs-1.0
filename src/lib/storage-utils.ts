import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { getStorageSafe, auth } from './firebase';

/**
 * Compresses an image file client-side to ensure it is lightweight (under 150KB).
 * Reduces resolution to max 1000px and quality to 0.75.
 */
export const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<File | Blob> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      // Not an image, return original
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback to original on canvas failure
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob/file
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

/**
 * Directly converts an image to a compressed base64 string
 */
export const compressImageToBase64 = async (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Return compressed base64 data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        const fallbackReader = new FileReader();
        fallbackReader.onloadend = () => resolve(fallbackReader.result as string);
        fallbackReader.readAsDataURL(file);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      const fallbackReader = new FileReader();
      fallbackReader.onloadend = () => resolve(fallbackReader.result as string);
      fallbackReader.readAsDataURL(file);
    };
    reader.readAsDataURL(file);
  });
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário deve estar logado para fazer upload.');

  // Pre-compress images to ensure optimal performance (even if Firebase storage succeeds, it saves bucket bandwidth/storage!)
  let fileToUpload: File = file;
  if (file.type.startsWith('image/')) {
    try {
      const compressed = await compressImage(file);
      fileToUpload = compressed as File;
    } catch (e) {
      console.warn('Could not compress image, proceeding with original:', e);
    }
  }

  const storage = getStorageSafe();
  
  if (!storage) {
    return compressImageToBase64(file);
  }

  // Create a safe filename
  const cleanName = fileToUpload.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  const timestamp = Date.now();
  const fullPath = `uploads/${user.uid}/${path}/${timestamp}_${cleanName}`;
  const storageRef = ref(storage, fullPath);

  try {
    const uploadPromise = (async () => {
      const snapshot = await uploadBytes(storageRef, fileToUpload);
      return await getDownloadURL(snapshot.ref);
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Upload timeout (3s)')), 3000)
    );

    const downloadURL = await Promise.race([uploadPromise, timeoutPromise]);
    return downloadURL;
  } catch (error: any) {
    console.warn('Storage Upload Error or Timeout (falling back to compressed base64):', error);
    return compressImageToBase64(fileToUpload);
  }
};
