import { useState, useEffect } from 'react';
import { Search, X, Upload } from 'lucide-react';
import { countries } from '../../lib/countries';
import { DatePicker } from '../ui/date-picker';

export type TripFormData = {
  title: string;
  country: string;
  location: string;
  lat: number | null;
  lng: number | null;
  budget: string;
  startDate: string;
  endDate: string;
  mainPhoto: File | null;
  mainPhotoPreview: string | null;
  isPublic: boolean;
};

type TripFormProps = {
  onSubmit: (data: TripFormData) => void;
  initialData?: Partial<TripFormData>;
};

export function TripForm({ onSubmit, initialData = {} }: TripFormProps) {
  const [title, setTitle] = useState(initialData.title || '');
  const [country, setCountry] = useState(initialData.country || '');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [location, setLocation] = useState(initialData.location || '');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [lat, setLat] = useState<number | null>(initialData.lat ?? null);
  const [lng, setLng] = useState<number | null>(initialData.lng ?? null);
  const [budget, setBudget] = useState(initialData.budget || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData.startDate ? new Date(initialData.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialData.endDate ? new Date(initialData.endDate) : undefined
  );
  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [mainPhotoPreview, setMainPhotoPreview] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(initialData.isPublic ?? true);
  const [error, setError] = useState<string | null>(null);

  const formatBudget = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBudget(e.target.value);
    setBudget(formatted);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Пожалуйста, выберите изображение в формате JPEG или PNG');
      return;
    }

    setMainPhoto(file);
    setMainPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (mainPhotoPreview) {
      URL.revokeObjectURL(mainPhotoPreview);
    }
    setMainPhoto(null);
    setMainPhotoPreview(null);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Пожалуйста, введите название маршрута');
      return;
    }

    if (!mainPhoto) {
      setError('Пожалуйста, добавьте главное фото маршрута');
      return;
    }

    if (!country) {
      setError('Пожалуйста, выберите страну');
      return;
    }

    if (!location) {
      setError('Пожалуйста, выберите место маршрута');
      return;
    }

    if (!budget) {
      setError('Пожалуйста, введите бюджет');
      return;
    }

    if (!startDate || !endDate) {
      setError('Пожалуйста, выберите даты поездки');
      return;
    }

    if (endDate < startDate) {
      setError('Дата окончания должна быть позже даты начала');
      return;
    }

    onSubmit({
      title,
      country,
      location,
      lat,
      lng,
      budget,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      mainPhoto,
      mainPhotoPreview,
      isPublic
    });
  };

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  useEffect(() => {
    const fetchLocations = async () => {
      if (locationSearch.length < 3 || !country) return;

      const selectedCountry = countries.find(c => c.name === country);
      const countryQuery = selectedCountry?.queryName || country;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch + ', ' + countryQuery)}&format=json&limit=5`
      );
      const data = await response.json();
      setLocationResults(data);
    };

    const timeout = setTimeout(fetchLocations, 300);
    return () => clearTimeout(timeout);
  }, [locationSearch, country]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Название маршрута
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded-lg"
          placeholder="Введите название маршрута"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Главное фото
        </label>
        {mainPhotoPreview ? (
          <div className="relative">
            <img
              src={mainPhotoPreview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              onClick={handleRemovePhoto}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <label className="block w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Upload className="w-8 h-8 mb-2" />
              <span>Нажмите, чтобы выбрать фото</span>
              <span className="text-sm">(JPEG или PNG)</span>
            </div>
          </label>
        )}
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Страна
        </label>
        <div className="relative">
          <input
            type="text"
            value={country}
            onClick={() => setShowCountries(true)}
            readOnly
            className="w-full p-2 border rounded-lg"
            placeholder="Выберите страну"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        {showCountries && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2 border-b">
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Поиск страны..."
                className="w-full p-2 border rounded"
                autoFocus
              />
            </div>
            <div>
              {filteredCountries.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCountry(c.name);
                    setShowCountries(false);
                    setCountrySearch('');
                  }}
                  className="w-full p-2 text-left hover:bg-gray-50"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Место маршрута
        </label>
        <input
          type="text"
          value={locationSearch}
          onChange={(e) => setLocationSearch(e.target.value)}
          className="w-full p-2 border rounded-lg"
          placeholder="Введите город, остров или достопримечательность"
        />
        {locationResults.length > 0 && (
          <div className="mt-1 border rounded bg-white shadow max-h-48 overflow-y-auto">
            {locationResults.map((result, idx) => (
              <button
                key={idx}
                className="block w-full text-left p-2 hover:bg-gray-100 text-sm"
                onClick={() => {
                  setLocation(result.display_name);
                  setLocationSearch(result.display_name);
                  setLat(parseFloat(result.lat));
                  setLng(parseFloat(result.lon));
                  setLocationResults([]);
                }}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Бюджет, руб.
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={budget}
          onChange={handleBudgetChange}
          className="w-full p-2 border rounded-lg"
          placeholder="200 000"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          selected={startDate}
          onSelect={setStartDate}
          label="Дата начала"
          maxDate={endDate}
        />
        <DatePicker
          selected={endDate}
          onSelect={setEndDate}
          label="Дата окончания"
          minDate={startDate}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Видимость
        </label>
        <div className="flex items-center justify-start space-x-3">
          <span className="text-sm text-gray-600 min-w-[100px]">
            {isPublic ? 'Видно всем' : 'Только мне 🔒'}
          </span>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 ${
              isPublic ? 'bg-[#FA5659]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                isPublic ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="pt-8">
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-[#FA5659] text-white rounded-lg hover:bg-[#E04E51]"
        >
          ДАЛЕЕ
        </button>
      </div>
    </div>
  );
}
