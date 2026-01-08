'use client';

import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

interface ArtworkLightboxProps {
  open: boolean;
  close: () => void;
  src: string;
  alt: string;
}

export default function ArtworkLightbox({ open, close, src, alt }: ArtworkLightboxProps) {
  return (
    <Lightbox
      open={open}
      close={close}
      slides={[{ src, alt }]}
      plugins={[Zoom]}
      controller={{ closeOnBackdropClick: true }}
      render={{
        buttonPrev: () => null,
        buttonNext: () => null,
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
      }}
    />
  );
}
