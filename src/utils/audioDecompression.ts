/**
 * Audio Decompression Utility
 * Handles gzip decompression for compressed audio files
 * Compatible with backend audio compression service
 */

import pako from 'pako';

export interface AudioCompressionMetadata {
  is_compressed: boolean;
  original_size?: number;
  compressed_size?: number;
}

/**
 * Decompress audio buffer if it's compressed
 * @param audioBuffer - Compressed or uncompressed audio bytes
 * @param metadata - Compression metadata from backend
 * @returns Decompressed audio buffer
 */
export async function decompressAudio(
  audioBuffer: ArrayBuffer | Uint8Array,
  metadata?: AudioCompressionMetadata
): Promise<ArrayBuffer> {
  // If metadata says it's compressed, or if no metadata but file extension suggests compression
  if (metadata?.is_compressed) {
    try {
      console.log('[AUDIO DECOMPRESS] 🗜️ Decompressing audio...', {
        original_size: metadata.original_size,
        compressed_size: metadata.compressed_size
      });
      
      const startTime = performance.now();
      
      // Convert to Uint8Array if needed
      const uint8Array = audioBuffer instanceof ArrayBuffer 
        ? new Uint8Array(audioBuffer)
        : audioBuffer;
      
      // Decompress using pako (gzip)
      const decompressed = pako.inflate(uint8Array);
      
      const decompressTime = performance.now() - startTime;
      console.log(
        `[AUDIO DECOMPRESS] ✅ Decompressed: ${metadata.compressed_size} → ${decompressed.length} bytes ` +
        `(${decompressTime.toFixed(1)}ms)`
      );
      
      return decompressed.buffer;
    } catch (error) {
      console.error('[AUDIO DECOMPRESS] ❌ Decompression failed:', error);
      // Return original buffer if decompression fails
      return audioBuffer instanceof ArrayBuffer ? audioBuffer : audioBuffer.buffer;
    }
  }
  
  // Not compressed, return as-is
  return audioBuffer instanceof ArrayBuffer ? audioBuffer : audioBuffer.buffer;
}

/**
 * Fetch and decompress audio file from URL
 * @param audioUrl - URL to fetch audio from
 * @param metadata - Compression metadata (optional)
 * @returns Decompressed audio blob
 */
export async function fetchAndDecompressAudio(
  audioUrl: string,
  metadata?: AudioCompressionMetadata
): Promise<Blob> {
  try {
    console.log('[AUDIO FETCH] 📥 Fetching audio:', audioUrl);
    const response = await fetch(audioUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }
    
    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Decompress if needed
    const decompressedBuffer = await decompressAudio(audioBuffer, metadata);
    
    // Determine content type
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    
    return new Blob([decompressedBuffer], { type: contentType });
  } catch (error) {
    console.error('[AUDIO FETCH] ❌ Error fetching/decompressing audio:', error);
    throw error;
  }
}

/**
 * Check if audio URL/file is compressed based on extension
 * Files with .mp3z extension are compressed
 */
export function isCompressedAudioUrl(url: string): boolean {
  return url.endsWith('.mp3z') || url.includes('.mp3z');
}

/**
 * Extract compression metadata from audio chunk message
 */
export function extractCompressionMetadata(data: any): AudioCompressionMetadata {
  return {
    is_compressed: data.is_compressed === true || isCompressedAudioUrl(data.audioUrl || ''),
    original_size: data.original_size,
    compressed_size: data.compressed_size
  };
}

