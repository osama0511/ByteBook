/**
 * ByteBook — Book File Picker & Extracted Figure Asset Storage
 * Manages importing EPUB/PDF/TXT files via `expo-document-picker`
 * and storing extracted book figures via `expo-file-system`.
 */

import * as DocumentPicker from 'expo-document-picker';

export interface PickedBookDocument {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export class AssetStorageService {
  /**
   * Opens the native iOS / Web file picker for selecting EPUB, PDF, or TXT books.
   */
  public async pickBookDocument(): Promise<PickedBookDocument | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/epub+zip',
        'application/pdf',
        'text/plain',
        '*/*',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name,
      size: asset.size,
      mimeType: asset.mimeType,
    };
  }
}

export const assetStorage = new AssetStorageService();
