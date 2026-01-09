import React from 'react';

interface HighlightedTextProps {
  text: string;
}

export default function HighlightedText({ text }: HighlightedTextProps) {
  const parts = text.split(/(<strong>.*?<\/strong>)/g);

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^<strong>(.*?)<\/strong>$/);
        if (match) {
          return <strong key={index}>{match[1]}</strong>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
