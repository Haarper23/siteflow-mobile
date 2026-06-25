import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { IssuePhoto } from '@/src/types/issue';
import { colors } from '@/src/theme/colors';

const DEFAULT_MAX_PHOTOS = 5;

interface PhotoPickerSectionProps {
  photos: IssuePhoto[];
  onChange: (photos: IssuePhoto[]) => void;
  maxPhotos?: number;
}

function createPhotoId(): string {
  return `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function assetToPhoto(asset: ImagePicker.ImagePickerAsset): IssuePhoto {
  return {
    id: createPhotoId(),
    uri: asset.uri,
    // Metadata can be missing on some platforms; guard against undefined.
    width: typeof asset.width === 'number' ? asset.width : undefined,
    height: typeof asset.height === 'number' ? asset.height : undefined,
    fileName: asset.fileName ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

export default function PhotoPickerSection({
  photos,
  onChange,
  maxPhotos = DEFAULT_MAX_PHOTOS,
}: PhotoPickerSectionProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const remaining = maxPhotos - photos.length;
  const atLimit = remaining <= 0;

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const next = assets.slice(0, remaining).map(assetToPhoto);
    if (next.length > 0) {
      onChange([...photos, ...next]);
    }
  };

  const handleTakePhoto = async () => {
    if (atLimit) return;

    if (Platform.OS === 'web') {
      Alert.alert(
        'Camera unavailable',
        'Taking a photo with the camera is not supported on web. Please use "Choose from Library" instead.',
      );
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera permission needed',
          'SiteFlow AI needs camera access to capture issue evidence. You can enable it in your device settings.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        addAssets(result.assets);
      }
    } catch {
      Alert.alert('Camera error', 'The camera could not be opened. Please try again.');
    }
  };

  const handlePickLibrary = async () => {
    if (atLimit) return;

    try {
      // Library permission is not required on web; requesting is a safe no-op.
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted && Platform.OS !== 'web') {
        Alert.alert(
          'Photo access needed',
          'SiteFlow AI needs photo library access to attach evidence. You can enable it in your device settings.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
      });

      if (!result.canceled) {
        addAssets(result.assets);
      }
    } catch {
      Alert.alert('Library error', 'The photo library could not be opened. Please try again.');
    }
  };

  const removePhoto = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, atLimit && styles.actionButtonDisabled]}
          onPress={handleTakePhoto}
          disabled={atLimit}
          activeOpacity={0.8}
          accessibilityLabel="Take photo"
        >
          <MaterialCommunityIcons name="camera-outline" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, atLimit && styles.actionButtonDisabled]}
          onPress={handlePickLibrary}
          disabled={atLimit}
          activeOpacity={0.8}
          accessibilityLabel="Choose from library"
        >
          <MaterialCommunityIcons name="image-multiple-outline" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>Choose from Library</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {photos.length} / {maxPhotos} photos
        </Text>
        {atLimit && <Text style={styles.limitText}>Maximum reached</Text>}
      </View>

      {photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.thumbWrapper}>
              <TouchableOpacity
                onPress={() => setPreviewUri(photo.uri)}
                activeOpacity={0.85}
                accessibilityLabel="Preview photo"
              >
                <Image source={{ uri: photo.uri }} style={styles.thumb} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(photo.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyNote}>
          <MaterialCommunityIcons name="camera-plus-outline" size={22} color={colors.textSecondary} />
          <Text style={styles.emptyNoteText}>
            No photos added yet. We recommend attaching at least one photo as evidence.
          </Text>
        </View>
      )}

      <Modal
        visible={previewUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setPreviewUri(null)}
            accessibilityLabel="Close preview"
          >
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          {previewUri !== null && (
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  limitText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbWrapper: {
    position: 'relative',
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  emptyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 16,
  },
  emptyNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '92%',
    height: '80%',
  },
});
