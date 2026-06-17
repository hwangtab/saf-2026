const mockAfter = jest.fn();

jest.mock('next/server', () => ({
  after: (cb: () => unknown) => mockAfter(cb),
}));

describe('after-response helpers', () => {
  let runAllSettled: typeof import('@/lib/server/after-response').runAllSettled;
  let afterAllSettled: typeof import('@/lib/server/after-response').afterAllSettled;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.resetModules();
    mockAfter.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mod = await import('@/lib/server/after-response');
    runAllSettled = mod.runAllSettled;
    afterAllSettled = mod.afterAllSettled;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('runs every task and logs rejected tasks without throwing', async () => {
    const calls: string[] = [];

    await expect(
      runAllSettled('notify-test', [
        async () => {
          calls.push('first');
        },
        async () => {
          calls.push('second');
          throw new Error('resend failed');
        },
        () => {
          calls.push('third');
        },
      ])
    ).resolves.toBeUndefined();

    expect(calls).toEqual(['first', 'second', 'third']);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[notify-test] task 2 failed:', expect.any(Error));
  });

  it('logs synchronous task throws without skipping later tasks', async () => {
    const calls: string[] = [];

    await expect(
      runAllSettled('sync-throw-test', [
        () => {
          calls.push('first');
          throw new Error('sync failed');
        },
        () => {
          calls.push('second');
        },
      ])
    ).resolves.toBeUndefined();

    expect(calls).toEqual(['first', 'second']);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[sync-throw-test] task 1 failed:',
      expect.any(Error)
    );
  });

  it('passes a promise-returning callback to next after so runtime can wait for settlement', async () => {
    const calls: string[] = [];
    let release!: () => void;
    const deferred = new Promise<void>((resolve) => {
      release = resolve;
    });

    afterAllSettled('after-test', [
      async () => {
        calls.push('started');
        await deferred;
        calls.push('finished');
      },
    ]);

    expect(mockAfter).toHaveBeenCalledTimes(1);
    const afterCallback = mockAfter.mock.calls[0][0] as () => Promise<void>;
    const callbackResult = afterCallback();
    expect(callbackResult).toBeInstanceOf(Promise);
    expect(calls).toEqual(['started']);

    release();
    await callbackResult;

    expect(calls).toEqual(['started', 'finished']);
  });
});
