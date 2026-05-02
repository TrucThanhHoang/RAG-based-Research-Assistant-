import { toast, ExternalToast } from "sonner";

const DEFAULT_DURATION = 4000;

type ToastInput = string | { title: string; description?: string };

function normalize(input: ToastInput): { title: string; description?: string } {
  return typeof input === "string" ? { title: input } : input;
}

function buildOptions(
  base: { description?: string; duration?: number },
  override?: ExternalToast,
): ExternalToast {
  return {
    duration: DEFAULT_DURATION,
    ...base,
    ...override,
  };
}

export const notify = {
  success(input: ToastInput, options?: ExternalToast) {
    const { title, description } = normalize(input);
    return toast.success(title, buildOptions({ description }, options));
  },

  error(input: ToastInput, options?: ExternalToast) {
    const { title, description } = normalize(input);
    return toast.error(title, buildOptions({ description, duration: 5000 }, options));
  },

  warning(input: ToastInput, options?: ExternalToast) {
    const { title, description } = normalize(input);
    return toast.warning(title, buildOptions({ description }, options));
  },

  info(input: ToastInput, options?: ExternalToast) {
    const { title, description } = normalize(input);
    return toast.info(title, buildOptions({ description }, options));
  },

  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) {
    return toast.promise(promise, messages);
  },

  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
