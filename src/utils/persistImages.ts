import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Copies picked images into an app-owned location so evidence photos survive
 * relaunches.
 *
 * ImagePicker / camera URIs typically point at temporary cache locations
 * (`.../ImagePicker/...`, `content://...`) that the OS may purge. We copy the
 * asset into the app document directory under a generated filename — never
 * reusing the client-supplied name (aligns with `security.md` "rename uploaded
 * files using generated IDs").
 *
 * Uses the SDK 54 `File`/`Directory` API; the legacy `copyAsync`/
 * `documentDirectory` helpers throw at runtime in this SDK.
 */

const PHOTO_DIR_NAME = 'siteflow_photos';

// Extensions we are willing to preserve on the stable copy. Anything else falls
// back to `jpg` rather than trusting an arbitrary client-supplied extension.
const SAFE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

function safeExtension(sourceUri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:[?#].*)?$/.exec(sourceUri);
  const ext = match ? match[1].toLowerCase() : '';
  return SAFE_EXTENSIONS.includes(ext) ? ext : 'jpg';
}

function generateFileName(sourceUri: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `photo-${Date.now().toString(36)}-${random}.${safeExtension(sourceUri)}`;
}

/**
 * Copies a picked asset into the app document directory and returns a stable
 * `file://` path.
 *
 * - On web there is no persistent app document directory, so the picked URI is
 *   returned unchanged (the browser keeps blob/object URLs for the session).
 * - On native a copy failure rejects, so the caller can surface a safe,
 *   path-free error rather than silently persisting a temporary URI.
 */
export async function persistPickedImage(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return sourceUri;
  }

  const dir = new Directory(Paths.document, PHOTO_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  const destination = new File(dir, generateFileName(sourceUri));
  const source = new File(sourceUri);
  source.copy(destination);
  return destination.uri;
}
