import sprite from '../../../../assets/icons/game-icons.svg?no-inline';

type IconName = 'arrow' | 'down' | 'check' | 'grip' | 'draw';

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <use href={`${sprite}#${name}`} />
    </svg>
  );
}
