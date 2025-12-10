// TypeScript definitions for requestIdleCallback
// This API is not yet fully standardized but widely supported

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

interface IdleRequestOptions {
  timeout?: number;
}

interface Window {
  requestIdleCallback(
    callback: (deadline: IdleDeadline) => void,
    options?: IdleRequestOptions
  ): number;
  cancelIdleCallback(handle: number): void;
}

declare function requestIdleCallback(
  callback: (deadline: IdleDeadline) => void,
  options?: IdleRequestOptions
): number;

declare function cancelIdleCallback(handle: number): void;

