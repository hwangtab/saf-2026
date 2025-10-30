interface TestimonialItem {
  quote: string;
  author: string;
  context?: string;
}

interface TestimonialGroupProps {
  title: string;
  testimonials: {
    category: string;
    items: TestimonialItem[];
  }[];
  backgroundClass?: string;
}

export default function TestimonialGroup({
  title,
  testimonials,
  backgroundClass = 'bg-gray-50',
}: TestimonialGroupProps) {
  return (
    <section className={`py-12 md:py-20 ${backgroundClass}`}>
      <div className="container-max">
        <h2 className="font-partial text-3xl md:text-4xl mb-12 text-center">
          {title}
        </h2>
        <div className="space-y-12">
          {testimonials.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h3 className="font-partial text-3xl md:text-4xl mb-8 text-center md:text-left text-primary-strong border-b-2 border-primary pb-4">
                {group.category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {group.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="bg-white p-6 rounded-lg shadow-lg border-l-8 border-primary flex flex-col justify-between"
                  >
                    <p className="text-xl md:text-2xl font-bold text-charcoal mb-4 italic leading-relaxed">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <div>
                      <p className="font-semibold text-primary">{item.author}</p>
                      {item.context && (
                        <p className="text-sm text-charcoal-muted">{item.context}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
