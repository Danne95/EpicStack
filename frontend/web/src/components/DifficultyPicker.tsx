import type { Difficulty } from '../../../../shared/ai/difficulty';

const OPTIONS: readonly { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'A little room to learn.' },
  { value: 'medium', label: 'Casual', description: 'A thoughtful opponent.' },
  { value: 'hard', label: 'Hard', description: 'Every placement matters.' },
  { value: 'expert', label: 'Expert', description: 'A challenge worth taking.' },
];

export function DifficultyPicker({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
}) {
  return (
    <fieldset className="difficulty-picker">
      <legend>Choose your opponent</legend>
      <div className="difficulty-options">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={value === option.value ? 'difficulty-option chosen' : 'difficulty-option'}
          >
            <input
              type="radio"
              name="difficulty"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
