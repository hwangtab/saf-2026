interface TestimonialCardProps {
  quote: string;
  author: string;
  context?: string;
  borderColor: string;
  bgColor?: string;
}

export default function TestimonialCard({
  quote,
  author,
  context,
  borderColor,
  bgColor = 'bg-white',
}: TestimonialCardProps) {
  return (
    <div className={`${bgColor} p-8 rounded-lg border-l-4 ${borderColor}`}>
      <p className="text-lg text-gray-700 italic mb-4">&quot;{quote}&quot;</p>
      <p className="font-semibold text-gray-800">— {author}</p>
      {context && <p className="text-sm text-gray-600 mt-3">{context}</p>}
    </div>
  );
}
