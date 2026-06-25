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
        // YouTube 임베드 재생에 필요한 최소 권한만 부여. 임의 top-level navigation 차단.
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        className="h-full w-full"
        loading="lazy"
      />
    </div>
  );
}
