interface VideoPlayerProps {
  id: string;
  title: string;
}

export default function VideoPlayer({ id, title }: VideoPlayerProps) {
  return (
    <div className="aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
        loading="lazy"
      />
    </div>
  );
}
