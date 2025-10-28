interface TestimonialCardProps {
  quote: string;
  author: string;
  context?: string;
  borderColor: string;
  bgColor?: string;
  contextColor?: string;
}

export default function TestimonialCard({
  quote,
  author,
  context,
  borderColor,
  bgColor = 'bg-white',
  contextColor = 'text-charcoal-muted',
}: TestimonialCardProps) {
  return (
    <div className={`${bgColor} p-8 rounded-lg border-l-4 ${borderColor}`}>
      <p className="text-lg text-charcoal italic mb-4">&quot;{quote}&quot;</p>
      <p className="font-semibold text-gray-800">— {author}</p>
      {context && <p className={`text-sm mt-3 ${contextColor}`}>{context}</p>}
    </div>
  );
}
