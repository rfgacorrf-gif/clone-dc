import path from 'path';
import { URL } from 'url';

export class Sanitizer {
  /**
   * Sanitize filename to prevent path traversal and injection attacks
   */
  static sanitizeFilename(filename: string): string {
    // Remove path separators and traversal attempts
    let safe = filename
      .replace(/\.\./g, '')
      .replace(/[/\\]/g, '_')
      .replace(/[<>:"|?*]/g, '')
      .replace(/\x00/g, '')
      .trim();

    if (safe.length === 0) {
      safe = 'file';
    }

    if (safe.length > 255) {
      safe = safe.substring(0, 255);
    }

    return safe;
  }

  /**
   * Sanitize application name for AndroidManifest
   */
  static sanitizeAppName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .substring(0, 128);
  }

  /**
   * Sanitize and validate package name
   */
  static sanitizePackageName(packageName: string): string {
    const parts = packageName.split('.');
    return parts
      .map(part =>
        part
          .replace(/[^a-zA-Z0-9_]/g, '')
          .replace(/^[^a-zA-Z]/, '')
          .toLowerCase()
      )
      .filter(part => part.length > 0)
      .join('.');
  }

  /**
   * Validate package name format
   */
  static isValidPackageName(packageName: string): boolean {
    const packageNameRegex = /^[a-zA-Z]([a-zA-Z0-9_])*(\.([a-zA-Z]([a-zA-Z0-9_])*))*$/;
    return packageNameRegex.test(packageName) && packageName.length <= 255;
  }

  /**
   * Sanitize prefix for naming
   */
  static sanitizePrefix(prefix: string): string {
    return prefix
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 50)
      .trim();
  }

  /**
   * Sanitize file path to prevent traversal
   */
  static sanitizePath(basePath: string, userPath: string): string {
    const normalized = path.normalize(userPath);
    if (normalized.startsWith('..')) {
      throw new Error('Path traversal detected');
    }
    const fullPath = path.join(basePath, normalized);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(basePath))) {
      throw new Error('Path escape detected');
    }
    return resolved;
  }

  /**
   * Validate URL
   */
  static isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is Dropbox shared link
   */
  static isDropboxUrl(urlString: string): boolean {
    if (!this.isValidUrl(urlString)) return false;
    const url = new URL(urlString);
    return url.hostname.includes('dropbox.com');
  }

  /**
   * Sanitize Dropbox URL to API format
   */
  static convertDropboxUrl(url: string): string {
    try {
      // Convert share link to download link
      if (url.includes('?dl=0')) {
        return url.replace('?dl=0', '?dl=1');
      }
      if (!url.includes('?dl=')) {
        return url + '?dl=1';
      }
      return url;
    } catch {
      return url;
    }
  }
}
