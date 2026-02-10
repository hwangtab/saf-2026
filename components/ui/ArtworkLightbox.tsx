'use client';

import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

interface ArtworkLightboxProps {
  open: boolean;
  close: () => void;
  src?: string;
  images?: string[];
  alt?: string;
  alts?: string[];
  initialIndex?: number;
}

export default function ArtworkLightbox({
  open,
  close,
  src,
  images,
  alt,
  alts,
  initialIndex = 0,
}: ArtworkLightboxProps) {
  const slides = (images || (src ? [src] : [])).map((img, i) => ({
    src: img,
    alt: alts?.[i] || alt || 'Artwork image',
  }));

  return (
    <Lightbox
      open={open}
      close={close}
      index={initialIndex}
      slides={slides}
      plugins={[Zoom]}
      controller={{ closeOnBackdropClick: true }}
      render={{
        buttonPrev: slides.length > 1 ? undefined : () => null,
        buttonNext: slides.length > 1 ? undefined : () => null,
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
      }}
    />
  );
}
