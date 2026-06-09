import { uploadEmailBroadcastImage } from '@/app/actions/admin-broadcast';

const uploadMock = jest.fn();
const getPublicUrlMock = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({
    storage: {
      from: jest.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  })),
}));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: jest.fn(async () => {}),
}));

describe('uploadEmailBroadcastImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({
      data: {
        publicUrl:
          'https://example.supabase.co/storage/v1/object/public/assets/email-broadcasts/admin-1/img.png',
      },
    });
  });

  it('rejects non-image files', async () => {
    const formData = new FormData();
    formData.append('file', new File(['x'], 'x.svg', { type: 'image/svg+xml' }));

    const result = await uploadEmailBroadcastImage(formData);

    expect(result).toEqual({
      message: 'JPG, PNG, GIF 이미지만 업로드할 수 있습니다.',
      error: true,
    });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('uploads allowed images to the assets email-broadcasts path', async () => {
    const formData = new FormData();
    formData.append('file', new File(['x'], 'x.png', { type: 'image/png' }));

    const result = await uploadEmailBroadcastImage(formData);

    expect(result.error).toBeFalsy();
    expect(result.url).toContain('/assets/email-broadcasts/admin-1/');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^email-broadcasts\/admin-1\/.+\.png$/),
      expect.any(File),
      expect.objectContaining({ contentType: 'image/png', upsert: false })
    );
  });

  it.each([
    ['900KB', 900 * 1024],
    ['1.2MB', Math.ceil(1.2 * 1024 * 1024)],
  ])('uploads %s images under the 2MB app limit', async (_label, size) => {
    const formData = new FormData();
    formData.append('file', new File([new Uint8Array(size)], 'sized.png', { type: 'image/png' }));

    const result = await uploadEmailBroadcastImage(formData);

    expect(result.error).toBeFalsy();
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^email-broadcasts\/admin-1\/.+\.png$/),
      expect.any(File),
      expect.objectContaining({ contentType: 'image/png', upsert: false })
    );
  });

  it('rejects images larger than 2MB', async () => {
    const formData = new FormData();
    const overLimit = new Uint8Array(2 * 1024 * 1024 + 1);
    formData.append('file', new File([overLimit], 'large.png', { type: 'image/png' }));

    const result = await uploadEmailBroadcastImage(formData);

    expect(result).toEqual({
      message: '이미지는 2MB 이하만 업로드할 수 있습니다.',
      error: true,
    });
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
