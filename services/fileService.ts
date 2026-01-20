
import { supabase } from './supabase';

export const uploadAvatar = async (userId: string, file: Blob): Promise<string> => {
  // 1. Define path: avatars/userId/timestamp.jpg
  const fileName = `${userId}/${Date.now()}.jpg`;

  // 2. Upload to Supabase 'avatars' bucket
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw new Error(error.message);
  }

  // 3. Get Public URL
  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};
