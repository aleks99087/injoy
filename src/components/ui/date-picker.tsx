import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import 'react-day-picker/dist/style.css';

type DatePickerProps = {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  label: string;
  minDate?: Date;
  maxDate?: Date;
};

export function DatePicker({ selected, onSelect, label, minDate, maxDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border rounded-lg flex items-center cursor-pointer hover:bg-gray-50"
      >
        <Calendar className="w-5 h-5 text-gray-400 mr-2" />
        <span className="flex-1">
          {selected ? format(selected, 'dd.MM.yyyy') : 'Выберите дату'}
        </span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/20" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="relative bg-white shadow-xl rounded-2xl w-[360px] max-w-full">
            <div className="p-4">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={(date) => {
                  onSelect(date);
                  setIsOpen(false);
                }}
                locale={ru}
                disabled={{ before: minDate, after: maxDate }}
                modifiers={{ today: new Date() }}
                modifiersStyles={{
                  today: { fontWeight: 'bold', color: '#FA5659' },
                  selected: {
                    backgroundColor: '#FA5659',
                    color: '#fff',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }
                }}
                styles={{
                  caption: { color: '#374151' },
                  head: { color: '#6B7280' },
                  nav: { color: '#374151' },
                  table: { width: '100%' },
                  day: { margin: 0 },
                  cell: { padding: '2px' }
                }}
                className="p-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}