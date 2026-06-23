import { ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MotionButton = ({
  label = "Join for free",
  className,
  fillClassName = "bg-[#F3EEE0]",
  onClick,
  type = "button",
  // Hover color of the text + arrow. Defaults preserve the original behavior;
  // pass overrides (e.g. the Hero passes dark teal) without touching defaults.
  hoverTextClassName = "group-hover:text-[#005B5B]",
  hoverIconClassName = "",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'group relative h-14 w-60 cursor-pointer rounded-full border-none p-1 bg-[#005B5B] shadow-md hover:shadow-xl transition-all overflow-hidden',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005B5B]',
        className
      )}
    >
      {/* The expanding fill circle - defaults to Hero beige (#F3EEE0); override via
          fillClassName (e.g. bg-white) so the button stays visible on any section. */}
      <span
        className={cn(
          'absolute left-1 top-1 block h-12 w-12 rounded-full transition-all duration-500 ease-in-out group-hover:w-full group-hover:h-full group-hover:left-0 group-hover:top-0',
          fillClassName
        )}
        aria-hidden='true'
      ></span>

      {/* The Arrow Icon */}
      <div className='icon absolute top-1/2 left-4 translate-x-0 -translate-y-1/2 duration-500 group-hover:translate-x-[0.4rem] z-10'>
        <ArrowRight className={cn('text-[#005B5B] size-6 transition-colors duration-300 ease-in-out', hoverIconClassName)} />
      </div>

      {/* The Text - framed within a safe zone to the right of the circle footprint */}
      <span className={cn('button-text text-white font-satoshi absolute top-1/2 left-16 right-4 -translate-y-1/2 text-center text-lg font-bold tracking-tight whitespace-nowrap transition-colors duration-300 ease-in-out z-10', hoverTextClassName)}>
        {label}
      </span>
    </button>
  );
};

export default MotionButton;
