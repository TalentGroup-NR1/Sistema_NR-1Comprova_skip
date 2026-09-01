import { Star } from 'lucide-react';

const COLUMNS = ['Trainee', 'Júnior', 'Pleno', 'Sênior', 'Especialista'];
const ROWS = ['I', 'II', 'III'];

export type StarState = 'inicio' | 'promocao' | null;
export type CareerGridStars = Record<string, StarState>;

interface CareerGridProps {
  stars: CareerGridStars;
  onStarClick?: (key: string, currentState: StarState) => void;
  readOnly?: boolean;
}

export function CareerGrid({ stars, onStarClick, readOnly = false }: CareerGridProps) {
  const handleClick = (col: number, row: number) => {
    if (readOnly || !onStarClick) return;
    const key = `${col}_${row}`;
    const current = stars[key] || null;
    onStarClick(key, current);
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-center gap-4 text-[10px] mb-2">
        <span className="flex items-center gap-1">
          Início <Star className="h-3 w-3 fill-blue-500 text-blue-500" />
        </span>
        <span className="flex items-center gap-1">
          promoção <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        </span>
      </div>
      <div className="space-y-1 flex flex-col items-center">
        {ROWS.map((row, rowIdx) => (
          <div key={row} className="flex items-center gap-1">
            <span className="text-[10px] font-medium w-4 text-gray-600">{row}</span>
            {COLUMNS.map((_, colIdx) => {
              const key = `${colIdx}_${rowIdx}`;
              const state = stars[key] || null;

              return (
                <Star
                  key={colIdx}
                  className={`h-5 w-5 transition-colors ${
                    state === 'inicio'
                      ? 'fill-blue-500 text-blue-500'
                      : state === 'promocao'
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-300 text-gray-300'
                  } ${!readOnly ? 'cursor-pointer hover:scale-110' : ''}`}
                  onClick={() => handleClick(colIdx, rowIdx)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1 ml-5 justify-center">
        {COLUMNS.map((col) => (
          <span key={col} className="text-[7px] text-gray-500 w-5 text-center leading-tight">
            {col.slice(0, 5)}
          </span>
        ))}
      </div>
    </div>
  );
}
