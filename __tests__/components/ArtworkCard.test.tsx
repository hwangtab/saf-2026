import { render, screen } from '@testing-library/react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { Artwork } from '@/lib/types';

// Mock ExportedImage since it requires complex next/image mocking
jest.mock('next-image-export-optimizer', () => ({
  __esModule: true,
  default: ({ fill, ...props }: any) => <img {...props} alt={props.alt} />,
}));

const mockArtwork: Artwork = {
  id: '123',
  title: 'Test Artwork',
  artist: 'Test Artist',
  image: 'test.jpg',
  price: '₩1,000,000',
  sold: false,
  description: 'Test Description',
  size: '100x100cm',
  material: 'Oil on Canvas',
  year: '2023',
  edition: '',
};

describe('ArtworkCard', () => {
  it('renders gallery variant with full details', () => {
    render(<ArtworkCard artwork={mockArtwork} variant="gallery" />);

    expect(screen.getByText('Test Artwork')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('Oil on Canvas · 100x100cm')).toBeInTheDocument();
    expect(screen.getByText('₩1,000,000')).toBeInTheDocument();
    // Material and size info should be present
  });

  it('renders slider variant with compact details', () => {
    render(<ArtworkCard artwork={mockArtwork} variant="slider" />);

    expect(screen.getByText('Test Artwork')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('₩1,000,000')).toBeInTheDocument();
    // Material and size should NOT be present in slider variant
    expect(screen.queryByText(/Oil on Canvas/)).not.toBeInTheDocument();
  });

  it('shows SOLD badge when sold is true', () => {
    const soldArtwork = { ...mockArtwork, sold: true };
    render(<ArtworkCard artwork={soldArtwork} variant="gallery" />);

    expect(screen.getAllByText('SOLD')).toHaveLength(1); // Badge
    expect(screen.getByText('판매완료')).toBeInTheDocument(); // Text
  });
});
