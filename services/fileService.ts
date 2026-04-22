
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

export const uploadAvatar = async (userId: string, file: Blob): Promise<string> => {
  try {
    const storage = getStorage(app);
    const timestamp = Date.now();
    const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '');
    const fileName = `avatars/${safeUserId}_${timestamp}.jpg`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file, { contentType: 'image/jpeg' });
    const downloadUrl = await getDownloadURL(storageRef);

    return `${downloadUrl}?t=${timestamp}`;
  } catch (error: any) {
    console.error('[Upload] Firebase Error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};
