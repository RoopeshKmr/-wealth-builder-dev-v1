import React from 'react';
import SecureSlidePlayer from '@/features/systematic-tools/components/secure-slide-player';

export const isSlidesUrl = (src: string) =>
  typeof src === 'string' && (src.includes('/pubembed?') || src.includes('/embed?'));

export const isPdfUrl = (src: string) =>
  typeof src === 'string' &&
  (src.includes('/preview') ||
    src.includes('drive.google.com') ||
    src.toLowerCase().includes('.pdf'));

// Normalize a PDF source URL for embedding in an <iframe>.
// - Google Drive: keep the /preview URL as-is. Rewriting to /uc?export=download
//   breaks for owner-restricted files ("Sorry, the owner hasn't given you
//   permission to download this file"). Drive's preview viewer still works.
// - Direct .pdf URLs (e.g. Firebase Storage): returned unchanged so the
//   browser's built-in PDF.js viewer (with text/draw annotation tools) loads.
export const toEmbeddablePdfUrl = (src: string) => {
  if (typeof src !== 'string') return src;
  const driveMatch = src.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return src;
};

interface FullscreenViewerProps {
  isOpen: boolean;
  src: string;
  title: string;
  onClose: () => void;
}

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({
  isOpen,
  src,
  title,
  onClose,
}) => {
  if (!isOpen) return null;

  const slides = isSlidesUrl(src);
  const pdf = isPdfUrl(src);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#cfcfcf',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: slides ? '#000' : '#cfcfcf',
        }}
      >
        {/* Title in the top center bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            textAlign: 'center',
            padding: '6px 0',
            color: '#222',
            fontSize: 14,
            fontWeight: 500,
            pointerEvents: 'none',
            zIndex: pdf ? 0 : 10000,
          }}
        >
          {title}
        </div>

        {/* Close button */}
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 12,
            right: 16,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            fontSize: 26,
            fontWeight: 700,
            cursor: 'pointer',
            zIndex: 10001,
            lineHeight: 1,
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          ×
        </button>

        {slides ? (
          <SecureSlidePlayer embedSrc={src} fillContainer />
        ) : pdf ? (
          <SecureSlidePlayer
            embedSrc={toEmbeddablePdfUrl(src)}
            fillContainer
            iframeSandbox={null}
          />
        ) : (
          <video
            title={title || 'Embedded content'}
            src={src}
            className="vault-embedded-video"
            controls
            playsInline
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
    </div>
  );
};

export default FullscreenViewer;
