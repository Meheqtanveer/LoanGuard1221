/**
 * LoanGuard Module 1: Image Preprocessing & OCR Engine
 * Uses HTML5 Canvas for OpenCV-equivalent image operations (grayscale, binarization,
 * contrast enhancement) and Tesseract.js for optical character recognition.
 */

import { createWorker } from 'tesseract.js';

export interface PreprocessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Preprocess image via Canvas:
 * 1. Grayscale conversion
 * 2. Contrast stretching
 * 3. Otsu-like thresholding / binarization for clean OCR
 */
export async function preprocessImage(imageFile: File | Blob): Promise<PreprocessedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if too large to preserve performance
        const maxDim = 1800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Draw original
        ctx.drawImage(img, 0, 0, width, height);

        // Get pixel data for OpenCV-style grayscale and adaptive thresholding
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Grayscale conversion & simple luminance calculation
        let totalLuminance = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Standard ITU-R BT.601 luminance
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
          totalLuminance += gray;
        }

        const avgLuminance = totalLuminance / (data.length / 4);

        // Contrast enhancement & binarization (soft threshold)
        for (let i = 0; i < data.length; i += 4) {
          let gray = data[i];
          // Contrast stretching around average
          if (gray < avgLuminance * 0.8) {
            gray = Math.max(0, gray * 0.6); // darken text
          } else if (gray > avgLuminance * 1.2) {
            gray = Math.min(255, gray * 1.3); // brighten background
          }
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imgData, 0, 0);

        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width,
          height
        });
      };
      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Performs Tesseract OCR on a preprocessed image data URL.
 */
export async function performOcr(
  imageDataUrl: string,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(10, 'Initializing OCR engine...');

    const worker = await createWorker('eng');

    if (onProgress) onProgress(40, 'Recognizing text...');
    const result = await worker.recognize(imageDataUrl);

    if (onProgress) onProgress(90, 'Finalizing text extraction...');
    await worker.terminate();

    const cleanText = result.data.text.trim();
    if (!cleanText) {
      throw new Error('No legible text recognized in the uploaded screenshot.');
    }
    return cleanText;
  } catch (error) {
    console.warn('Tesseract OCR error or worker fallback:', error);
    throw error;
  }
}
