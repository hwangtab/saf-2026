'use client';

import LiteYouTubeEmbed from 'react-lite-youtube-embed';
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css';

interface VideoEmbedProps {
  id: string;
  title: string;
}

export default function VideoEmbed({ id, title }: VideoEmbedProps) {
  return (
    <div className="aspect-video">
      <LiteYouTubeEmbed id={id} title={title} poster="hqdefault" />
    </div>
  );
}
