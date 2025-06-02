// hhh-standalone-test

function typeChecks(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

typeChecks(`@typescript-eslint/return-await`, () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const promiseValue = () => Promise.resolve(null);

  const myAsyncFunction = async () => {
    // eslint-disable-next-line @typescript-eslint/return-await
    return promiseValue();
  };

  const mySyncFunction = () => {
    return promiseValue();
  };

  void myAsyncFunction();
  void mySyncFunction();
});
