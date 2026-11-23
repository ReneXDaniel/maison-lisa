import clsx from "clsx";
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const control =
  "w-full bg-ivory-50/80 border border-taupe/40 px-4 text-[15px] text-charcoal placeholder:text-taupe-600/70 transition-colors duration-300 focus:border-espresso focus:bg-ivory-50 focus:outline-none aria-[invalid=true]:border-danger";

type Common = { label: ReactNode; hint?: ReactNode; error?: string | null; className?: string };

export function Field({ label, hint, error, className, id, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <label htmlFor={fid} className="eyebrow text-taupe-700">
        {label}
      </label>
      <input
        id={fid}
        className={clsx(control, "h-12")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        {...rest}
      />
      {hint && !error && (
        <p id={`${fid}-hint`} className="text-xs text-taupe-700">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fid}-err`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({ label, hint, error, className, id, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <label htmlFor={fid} className="eyebrow text-taupe-700">
        {label}
      </label>
      <textarea id={fid} className={clsx(control, "min-h-28 py-3 leading-relaxed")} aria-invalid={error ? true : undefined} {...rest} />
      {hint && !error && <p className="text-xs text-taupe-700">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  hint,
  error,
  className,
  id,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <label htmlFor={fid} className="eyebrow text-taupe-700">
        {label}
      </label>
      <select id={fid} className={clsx(control, "h-12 appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10")} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232C1F18' stroke-width='1.6'><path d='m6 9 6 6 6-6'/></svg>\")" }} aria-invalid={error ? true : undefined} {...rest}>
        {children}
      </select>
      {hint && !error && <p className="text-xs text-taupe-700">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, error, className, id, ...rest }: Omit<Common, "hint"> & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <label htmlFor={fid} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-charcoal">
        <input
          id={fid}
          type="checkbox"
          className="mt-1 size-4 shrink-0 cursor-pointer appearance-none border border-espresso/60 bg-ivory-50 transition checked:border-espresso checked:bg-espresso checked:bg-[url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23F7F2EB' stroke-width='3'><path d='m5 12.5 4.5 4.5L19 7.5'/></svg>&quot;)] bg-center bg-no-repeat"
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p role="alert" className="pl-7 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
