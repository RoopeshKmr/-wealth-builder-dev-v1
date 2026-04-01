import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { ButtonIcon } from '../button-icon';
import { Heading } from '../typography';

interface ModalProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
}

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
  contentClassName,
  showCloseButton = true,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className={['fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4', className || ''].join(' ').trim()}>
      <div className={['w-full max-w-[860px] rounded-2xl border border-white/15 bg-[#1e2431] p-6 text-white shadow-2xl', contentClassName || ''].join(' ').trim()}>
        {(title || showCloseButton) && (
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <Heading as="h3" variant="h5" className="text-white">{title}</Heading>
            {showCloseButton ? (
              <ButtonIcon
                icon={<X size={18} strokeWidth={2.5} />}
                ariaLabel="Close"
                variant="outline"
                onClick={onClose}
                className="rounded-lg border-white/20 bg-white/5 hover:bg-white/10"
              />
            ) : null}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
