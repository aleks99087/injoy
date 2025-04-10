import { useState, useEffect } from 'react';
import { MapPin, X, Plus } from 'lucide-react';
import type { PointInput } from './types';


type PointFormProps = {
  point: PointInput;
  onUpdate: (point: PointInput) => void;
  onShowMap: () => void;
  onAddPoint: () => void;
  onSave: () => void;
  isSaving: boolean;
  onMount?: () => void;
};

export function PointForm({ 
  point, 
  onUpdate, 
  onShowMap, 
  onAddPoint,
  onSave,
  isSaving,
}: PointFormProps) {
  const handlePhotoSelect = (files: FileList | null) => {
    if (!files) return;

    // Filter for jpeg/png only
    const validFiles = Array.from(files).filter(file => 
      ['image/jpeg', 'image/png'].includes(file.type)
    );

    if (validFiles.length !== files.length) {
      alert('Пожалуйста, выбирайте только изображения в формате JPEG или PNG');
    }
    
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    
    onUpdate({
      ...point,
      photos: [...point.photos, ...validFiles],
      previewUrls: [...point.previewUrls, ...newPreviewUrls]
    });
  };

  const handleRemovePhoto = (photoIndex: number) => {
    URL.revokeObjectURL(point.previewUrls[photoIndex]);
    
    const newPhotos = point.photos.filter((_, i) => i !== photoIndex);
    const newPreviewUrls = point.previewUrls.filter((_, i) => i !== photoIndex);
    
    onUpdate({
      ...point,
      photos: newPhotos,
      previewUrls: newPreviewUrls
    });
  }; 
  
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Название
        </label>
        <input
          type="text"
          value={point.name}
          onChange={(e) => onUpdate({ ...point, name: e.target.value })}
          className="w-full p-2 border rounded-lg"
          placeholder="Введите название точки маршрута"
          disabled={isSaving}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Координаты
        </label>
        <button
          onClick={onShowMap}
          disabled={isSaving}
          className="w-full p-2 border rounded-lg text-left flex items-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MapPin className="w-5 h-5 mr-2" />
          {point.latitude 
            ? `${point.latitude}, ${point.longitude}`
            : "Выбрать на карте"}
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Фото
        </label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {point.previewUrls.map((url, photoIndex) => (
            <div key={photoIndex} className="relative">
              <img
                src={url}
                alt=""
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => handleRemovePhoto(photoIndex)}
                disabled={isSaving}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <label className={`w-full h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoSelect(e.target.files)}
              disabled={isSaving}
            />
            <Plus className="w-6 h-6 text-gray-400" />
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Как добраться
        </label>
        <textarea
          value={point.how_to_get}
          onChange={(e) => onUpdate({ ...point, how_to_get: e.target.value })}
          className="w-full p-2 border rounded-lg"
          rows={4}
          placeholder="Опишите как добраться до точки маршрута"
          disabled={isSaving}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Впечатления
        </label>
        <textarea
          value={point.impressions}
          onChange={(e) => onUpdate({ ...point, impressions: e.target.value })}
          className="w-full p-2 border rounded-lg"
          rows={4}
          placeholder="Поделитесь впечатлениями"
          disabled={isSaving}
        />
      </div>

      <div className="space-y-4">
        <button
          onClick={onAddPoint}
          disabled={isSaving}
          className="w-full py-3 border-2 border-dashed rounded-lg text-[#FA5659] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ДОБАВИТЬ ТОЧКУ В МАРШРУТ
        </button>

        <button
          onClick={onSave}
          disabled={isSaving}
          className="w-full py-3 bg-[#FA5659] text-white rounded-lg hover:bg-[#E04E51] disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
          {isSaving ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              СОХРАНЕНИЕ...
            </div>
          ) : (
            'СОХРАНИТЬ'
          )}
        </button>
      </div>
    </div>
  );
}