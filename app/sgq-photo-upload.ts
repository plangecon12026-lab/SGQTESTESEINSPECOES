'use client';
import {contractFetch} from './contract-client';


/** Send the image as bytes: multipart POSTs are treated as Server Actions by vinext. */
export async function uploadSGQPhoto(file: File): Promise<string> {
  const response = await contractFetch('/api/sgq/photo', {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok || !result.url) throw new Error(result.error || 'Falha ao enviar uma foto.');
  return result.url;
}
