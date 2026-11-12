import { type ClientErrorCode, describeError } from "@finance/api-client";
import { CircleAlert } from "lucide-react";

interface FormErrorProps {
  error: unknown;
  /** Context-specific messages, e.g. UNAUTHORIZED on login = wrong email or password. */
  overrides?: Partial<Record<ClientErrorCode, string>>;
}

/** Error of a mutation that does not belong to a single field. */
export function FormError({ error, overrides }: FormErrorProps) {
  if (!error) {
    return null;
  }
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-2xl bg-expense/10 px-4 py-3 text-sm text-expense"
    >
      <CircleAlert aria-hidden className="size-4 shrink-0" />
      {describeError(error, overrides)}
    </p>
  );
}
