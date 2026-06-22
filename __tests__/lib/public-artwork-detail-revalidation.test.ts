import { revalidatePublicArtworkDetails } from '@/lib/utils/revalidate';

const mockRevalidatePath = jest.fn();
const mockRevalidateTag = jest.fn();

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

describe('revalidatePublicArtworkDetails', () => {
  beforeEach(() => {
    mockRevalidatePath.mockClear();
    mockRevalidateTag.mockClear();
  });

  it('개별 작품 상세를 KO/EN 둘 다 한 번씩 무효화한다', () => {
    revalidatePublicArtworkDetails(['art-1', ' ', null, 'art-1']);

    expect(mockRevalidatePath.mock.calls).toEqual([['/artworks/art-1'], ['/en/artworks/art-1']]);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
