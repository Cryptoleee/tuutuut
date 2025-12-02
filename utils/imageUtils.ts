
/**
 * Compresses and resizes an image file to ensure it's lightweight.
 * Max dimensions: 1920x1920
 * Quality: 0.7 (JPEG)
 */
export const compressImage = async (file: File): Promise<File> => {
  // If file is SVG, do not compress it to maintain transparency and quality
  if (file.type === 'image/svg+xml') {
    return file;
  }

  // If file is already small (< 500KB) and represents an image, just return it
  if (file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      let width = img.width;
      let height = img.height;
      const maxDimension = 1920;

      // Calculate new dimensions ensuring max dimension isn't exceeded
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob (JPEG at 70% quality)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create a new File object from the blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error("Image compression failed"));
          }
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};