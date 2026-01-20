
import { supabase } from './supabase';

export const uploadAvatar = async (userId: string, file: Blob): Promise<string> => {
  // Use a flat filename structure to avoid potential RLS issues with folders
  const timestamp = Date.now();
  // Sanitize userId to ensure safe filename
  const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '');
  const fileName = `${safeUserId}_${timestamp}.jpg`;

  console.log(`[Upload] Starting avatar upload: ${fileName}, Size: ${file.size} bytes`);

  // Upload to Supabase 'avatars' bucket
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/jpeg'
    });

  if (error) {
    console.error('[Upload] Supabase Error:', error);
    // Return a user-friendly error if it's a permissions issue
    if (error.message.includes('row-level security') || error.message.includes('polic') || error.message.includes('new row violates')) {
        throw new Error("Permission denied. Ensure 'avatars' bucket is Public and has INSERT policies.");
    }
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get Public URL
  // NOTE: This only works if the bucket is set to 'Public' in Supabase dashboard
  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  if (!publicUrlData.publicUrl) {
      throw new Error("Could not generate public URL");
  }

  console.log(`[Upload] Success. URL: ${publicUrlData.publicUrl}`);

  // Cache bust
  return `${publicUrlData.publicUrl}?t=${timestamp}`;
};
