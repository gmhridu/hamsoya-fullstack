/**
 * Image compression utility functions
 * Provides image compression capabilities for optimized uploads
 */

interface CompressionSettings {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'webp' | 'png';
  maxSizeKB: number;
}

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compress an image file using canvas
 * @param file - The image file to compress
 * @param settings - Compression settings
 * @returns Promise<CompressionResult> - The compressed file and metadata
 */
export async function compressImage(
  file: File,
  settings: CompressionSettings
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > settings.maxWidth || height > settings.maxHeight) {
          const ratio = Math.min(settings.maxWidth / width, settings.maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Create canvas and draw the image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Get the compressed image as blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Create a new File object from the blob
            const compressedFile = new File([blob], file.name, {
              type: settings.format === 'jpeg' ? 'image/jpeg' :
                    settings.format === 'webp' ? 'image/webp' : 'image/png',
              lastModified: Date.now()
            });

            const result: CompressionResult = {
              file: compressedFile,
              originalSize: file.size,
              compressedSize: compressedFile.size,
              compressionRatio: file.size / compressedFile.size
            };

            resolve(result);
          },
          settings.format === 'jpeg' ? 'image/jpeg' :
          settings.format === 'webp' ? 'image/webp' : 'image/png',
          settings.quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file for compression'));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if an image file should be compressed based on size
 * @param file - The image file to check
 * @param maxSizeKB - Maximum size in KB before compression is needed
 * @returns boolean - Whether the image should be compressed
 */
export function shouldCompressImage(file: File, maxSizeKB: number): boolean {
  return file.size > maxSizeKB * 1024;
}

/**
 * Format file size for display
 * @param sizeInBytes - File size in bytes
 * @returns string - Formatted file size (e.g., "2.5 MB", "750 KB")
 */
export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} bytes`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
