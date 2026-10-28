export const scheduler = {
  async yield(): Promise<void> {
    // oxlint-disable-next-line typescript/no-unnecessary-condition, typescript/strict-boolean-expressions
    if (globalThis.scheduler?.yield) {
      await globalThis.scheduler.yield();
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 0);
    });
  },
};
