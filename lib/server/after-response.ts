import { after } from 'next/server';

type AfterResponseTask = () => Promise<unknown> | unknown;

export async function runAllSettled(label: string, tasks: AfterResponseTask[]): Promise<void> {
  const results = await Promise.allSettled(tasks.map(async (task) => task()));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[${label}] task ${index + 1} failed:`, result.reason);
    }
  });
}

export function afterAllSettled(label: string, tasks: AfterResponseTask[]): void {
  after(() => runAllSettled(label, tasks));
}
