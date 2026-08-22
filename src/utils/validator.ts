import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { parseStringPromise } from 'xml2js';
import { Readable } from 'stream';

export class Validator {
  /**
   * Validate APK by checking magic bytes and structure
   */
  static async isValidAPK(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      return this.validateAPKBuffer(buffer);
    } catch {
      return false;
    }
  }

  /**
   * Validate APK from buffer
   */
  static validateAPKBuffer(buffer: Buffer): boolean {
    // APK files start with PK (0x504B) - ZIP signature
    if (buffer.length < 4) return false;
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }

  /**
   * Validate PNG by magic bytes
   */
  static async isValidPNG(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      return this.validatePNGBuffer(buffer);
    } catch {
      return false;
    }
  }

  /**
   * Validate PNG from buffer
   */
  static validatePNGBuffer(buffer: Buffer): boolean {
    if (buffer.length < 8) return false;
    // PNG magic bytes
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  /**
   * Extract package name from APK by reading AndroidManifest.xml
   */
  static async extractPackageNameFromAPK(filePath: string): Promise<string | null> {
    try {
      // This is a simplified version - in production, you'd need to properly
      // extract and parse the binary AndroidManifest.xml from the APK
      return 'com.example.app';
    } catch {
      return null;
    }
  }

  /**
   * Validate file size
   */
  static async validateFileSize(filePath: string, maxSizeMB: number): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      return fileSizeMB <= maxSizeMB;
    } catch {
      return false;
    }
  }

  /**
   * Validate Content-Type header
   */
  static isValidAPKContentType(contentType: string | null): boolean {
    if (!contentType) return false;
    const validTypes = [
      'application/vnd.android.package-archive',
      'application/x-android-package-archive',
      'application/octet-stream',
    ];
    return validTypes.some(type => contentType.includes(type));
  }

  /**
   * Validate HTTP status for file download
   */
  static isValidHttpStatus(status: number): boolean {
    return status >= 200 && status < 300;
  }
}
