import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Eye, EyeOff, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const FilterBarContext = createContext(false);

/* ---------------------------------- Button --------------------------------- */

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
export type ButtonSize = "small" | "medium" | "large";

const HEIGHTS: Record<ButtonSize, string> = {
  small: "var(--button-height-small)",
  medium: "var(--button-height-medium)",
  large: "var(--button-height-large)",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--semantic-primary-default)] text-[var(--semantic-text-on-accent)] hover:bg-[var(--semantic-primary-hover)] active:bg-[var(--semantic-primary-selected)]",
  secondary:
    "bg-[var(--semantic-bg-secondary-selected)] text-[var(--semantic-text-secondary)] hover:bg-[var(--semantic-bg-outline)]",
  outline:
    "bg-transparent border border-[var(--semantic-button-outline)] text-[var(--semantic-text-secondary)] hover:bg-[var(--semantic-outline-hover-bg)]",
  danger:
    "bg-[var(--semantic-danger-default)] text-[var(--semantic-text-on-accent)] hover:bg-[var(--semantic-danger-hover)] active:bg-[var(--semantic-danger-hover)]",
  ghost:
    "bg-transparent text-[var(--semantic-text-primary)] hover:bg-[var(--semantic-bg-secondary-selected)] hover:text-[var(--semantic-text-secondary)]",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "medium",
    loading,
    fullWidth,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={{
        height: HEIGHTS[size],
        borderRadius: "var(--radius-sm)",
        paddingInline: "var(--spacing-5xl)",
      }}
      className={cn(
        "inline-flex items-center justify-center gap-[var(--spacing-2xl)] text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:bg-[var(--semantic-disabled)] disabled:text-[var(--semantic-text-disabled)] disabled:border-transparent",
        VARIANTS[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  children,
  variant = "ghost",
  className,
  ...props
}: ButtonProps & { label: string }) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant={variant}
      size="small"
      className={cn("aspect-square !px-0", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

/* ---------------------------------- Fields --------------------------------- */

function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  compact = false,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-[var(--spacing-lg)]", compact && "shrink-0")}>
      <label
        htmlFor={id}
        className={cn("text-sm text-[var(--semantic-text-primary)]", compact && "sr-only")}
      >
        {label}
        {required ? (
          <span className="ml-[var(--spacing-md)] text-[var(--semantic-danger-default)]">*</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-[var(--semantic-text-primary)]">{hint}</p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-[var(--semantic-danger-default)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlClass =
  "w-full bg-[var(--semantic-bg-secondary)] border border-[var(--semantic-bg-outline)] text-[var(--semantic-text-secondary)] placeholder:text-[var(--semantic-text-primary)] data-[placeholder]:text-[var(--semantic-text-primary)] outline-none transition-colors focus:border-[var(--semantic-field-active-border)] focus:bg-[var(--semantic-field-active-bg)] focus:outline-none focus-visible:outline-none data-[state=open]:border-[var(--semantic-field-active-border)] data-[state=open]:bg-[var(--semantic-field-active-bg)] disabled:text-[var(--semantic-text-disabled)]";

const controlStyle = {
  height: "var(--button-height-medium)",
  borderRadius: "var(--radius-sm)",
  paddingInline: "var(--spacing-4xl)",
} as const;

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, required, id, className, ...props },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const inFilterBar = useContext(FilterBarContext);
  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      compact={inFilterBar}
    >
      <input
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        style={controlStyle}
        className={cn(controlClass, className)}
        {...props}
      />
    </FieldShell>
  );
});

export const MoneyField = forwardRef<HTMLInputElement, TextFieldProps>(function MoneyField(
  { className, ...props },
  ref,
) {
  return (
    <TextField
      ref={ref}
      type="number"
      step="0.01"
      min="0"
      inputMode="decimal"
      className={cn(
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
      {...props}
    />
  );
});

export const PasswordField = forwardRef<HTMLInputElement, TextFieldProps>(function PasswordField(
  { label, error, hint, required, id, ...props },
  ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={fieldId} label={label} required={required} error={error} hint={hint}>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          type={visible ? "text" : "password"}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          style={controlStyle}
          className={cn(controlClass, "pr-[var(--spacing-12xl)]")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-[var(--spacing-4xl)] top-1/2 -translate-y-1/2 text-[var(--semantic-text-primary)] hover:text-[var(--semantic-text-secondary)]"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FieldShell>
  );
});

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  {
    label,
    error,
    hint,
    required,
    id,
    options,
    placeholder,
    className,
    value,
    defaultValue,
    disabled,
    onChange,
    onBlur,
    name,
    ...props
  },
  forwardedRef,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const inFilterBar = useContext(FilterBarContext);
  const nativeRef = useRef<HTMLSelectElement | null>(null);
  const controlledValue =
    typeof value === "string" || typeof value === "number" ? String(value) : undefined;
  const initialValue =
    typeof defaultValue === "string" || typeof defaultValue === "number"
      ? String(defaultValue)
      : placeholder
        ? ""
        : (options[0]?.value ?? "");

  const setNativeRef = (node: HTMLSelectElement | null) => {
    nativeRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const dispatchNativeChange = (nextValue: string) => {
    const select = nativeRef.current;
    if (!select) return;
    select.value = nextValue;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const dispatchNativeBlur = () => {
    const select = nativeRef.current;
    if (!select) return;
    select.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  };

  const selectedLabel =
    options.find((option) => option.value === controlledValue)?.label ??
    options.find((option) => option.value === initialValue)?.label;

  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      compact={inFilterBar}
    >
      <SelectPrimitive.Root
        value={controlledValue}
        defaultValue={controlledValue === undefined ? initialValue : undefined}
        disabled={disabled}
        onValueChange={dispatchNativeChange}
      >
        <SelectPrimitive.Trigger
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          onBlur={dispatchNativeBlur}
          style={controlStyle}
          className={cn(
            controlClass,
            "group flex cursor-pointer items-center justify-between gap-[var(--spacing-4xl)] text-left disabled:cursor-not-allowed",
            inFilterBar && "w-auto min-w-[150px]",
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder}>
            <span className="block min-w-0 flex-1 truncate">
              {inFilterBar ? `${label}: ` : null}
              {controlledValue
                ? options.find((option) => option.value === controlledValue)?.label
                : (selectedLabel ?? placeholder)}
            </span>
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon asChild>
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden border border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-secondary)] text-[var(--semantic-text-secondary)]"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <SelectPrimitive.Viewport className="scrollbar-hidden max-h-[inherit] overflow-y-auto p-[var(--spacing-md)]">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="select-item flex h-[var(--button-height-medium)] cursor-pointer select-none items-center px-[var(--spacing-4xl)] text-sm outline-none"
                  style={{ borderRadius: "var(--radius-xs)" }}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>

        <select
          ref={setNativeRef}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          name={name}
          required={required}
          value={controlledValue}
          defaultValue={controlledValue === undefined ? initialValue : undefined}
          disabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SelectPrimitive.Root>
    </FieldShell>
  );
});

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  label = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  filterAlignment?: "left";
}) {
  const id = useId();
  const inFilterBar = useContext(FilterBarContext);
  return (
    <div
      className={cn(
        "filter-text-input flex min-w-[220px] flex-1 flex-col gap-[var(--spacing-lg)]",
        inFilterBar && "w-[300px] min-w-0 flex-none shrink-0 gap-0",
      )}
    >
      <label
        htmlFor={id}
        className={cn("text-sm text-[var(--semantic-text-primary)]", inFilterBar && "sr-only")}
      >
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-[var(--spacing-4xl)] top-1/2 size-4 -translate-y-1/2 text-[var(--semantic-text-primary)]"
        />
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          style={{
            height: "var(--button-height-medium)",
            borderRadius: "var(--radius-sm)",
            paddingInline: "var(--spacing-9xl)",
          }}
          className={controlClass}
        />
      </div>
    </div>
  );
}

export function DateRangeField({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  const fromId = useId();
  const toId = useId();
  const inFilterBar = useContext(FilterBarContext);
  return (
    <div className="flex items-end gap-[var(--spacing-2xl)]">
      <div className={cn("flex flex-col gap-[var(--spacing-lg)]", inFilterBar && "shrink-0 gap-0")}>
        <label
          htmlFor={fromId}
          className={cn("text-sm text-[var(--semantic-text-primary)]", inFilterBar && "sr-only")}
        >
          From
        </label>
        <div className="relative">
          {inFilterBar ? (
            <span className="pointer-events-none absolute left-[var(--spacing-4xl)] top-1/2 z-10 -translate-y-1/2 text-sm text-[var(--semantic-text-primary)]">
              From:
            </span>
          ) : null}
          <input
            id={fromId}
            type="date"
            value={from}
            onChange={(e) => onChange({ from: e.target.value, to })}
            style={{
              height: "var(--button-height-medium)",
              borderRadius: "var(--radius-sm)",
              paddingLeft: inFilterBar ? "var(--spacing-13xl)" : "var(--spacing-4xl)",
              paddingRight: "var(--spacing-4xl)",
            }}
            className={cn(controlClass, !from && "text-[var(--semantic-text-primary)]")}
          />
        </div>
      </div>
      <div className={cn("flex flex-col gap-[var(--spacing-lg)]", inFilterBar && "shrink-0 gap-0")}>
        <label
          htmlFor={toId}
          className={cn("text-sm text-[var(--semantic-text-primary)]", inFilterBar && "sr-only")}
        >
          To
        </label>
        <div className="relative">
          {inFilterBar ? (
            <span className="pointer-events-none absolute left-[var(--spacing-4xl)] top-1/2 z-10 -translate-y-1/2 text-sm text-[var(--semantic-text-primary)]">
              To:
            </span>
          ) : null}
          <input
            id={toId}
            type="date"
            value={to}
            onChange={(e) => onChange({ from, to: e.target.value })}
            style={{
              height: "var(--button-height-medium)",
              borderRadius: "var(--radius-sm)",
              paddingLeft: inFilterBar ? "var(--spacing-9xl)" : "var(--spacing-4xl)",
              paddingRight: "var(--spacing-4xl)",
            }}
            className={cn(controlClass, !to && "text-[var(--semantic-text-primary)]")}
          />
        </div>
      </div>
    </div>
  );
}

export function OtpField({
  value,
  onChange,
  error,
  align = "start",
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  align?: "start" | "center" | "end";
}) {
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  const setDigit = (index: number, digit: string) => {
    const next = value.padEnd(6, " ").split("");
    next[index] = digit;
    onChange(next.join("").replace(/\s/g, "").slice(0, 6));
  };

  return (
    <fieldset
      className={cn(
        "flex flex-col gap-[var(--spacing-lg)]",
        align === "center" && "items-center text-center",
        align === "end" && "items-end text-right",
      )}
    >
      <legend
        className={cn(
          "mb-[var(--spacing-lg)] text-sm text-[var(--semantic-text-selected)]",
          align === "center" && "w-full text-center",
          align === "end" && "w-full text-right",
        )}
      >
        Six-digit verification code
      </legend>
      <div
        className={cn(
          "flex gap-[var(--spacing-md)] sm:gap-[var(--spacing-2xl)]",
          align === "center" && "justify-center",
          align === "end" && "justify-end",
        )}
        role="group"
        aria-label="Verification code"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            aria-label={`Digit ${index + 1}`}
            inputMode="numeric"
            maxLength={1}
            value={digit.trim()}
            aria-invalid={error ? true : undefined}
            onPaste={(event) => {
              event.preventDefault();
              const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              if (pasted) onChange(pasted);
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digit.trim() && index > 0) {
                const prev = event.currentTarget.previousElementSibling as HTMLInputElement | null;
                prev?.focus();
              }
            }}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "");
              setDigit(index, next);
              if (next) {
                const sibling = event.target.nextElementSibling as HTMLInputElement | null;
                sibling?.focus();
              }
            }}
            style={{
              height: "clamp(40px, 11vw, var(--button-height-large))",
              width: "clamp(40px, 11vw, var(--button-height-large))",
              borderRadius: "var(--radius-sm)",
            }}
            className={cn(controlClass, "text-center text-lg")}
          />
        ))}
      </div>
      {error ? (
        <p
          role="alert"
          className={cn(
            "text-xs text-[var(--semantic-danger-default)]",
            align === "center" && "text-center",
            align === "end" && "text-right",
          )}
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/* --------------------------------- Surfaces -------------------------------- */

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      style={{ borderRadius: "var(--radius-md)", padding: "var(--spacing-6xl)" }}
      className={cn(
        "border border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-secondary)] [box-shadow:0_1px_2px_var(--semantic-surface-shadow)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-5xl)]">
      <div className="flex flex-col gap-[var(--spacing-lg)]">
        <h1 className="text-2xl font-semibold text-[var(--semantic-text-secondary)]">{title}</h1>
        {description ? (
          <p className="text-sm text-[var(--semantic-text-primary)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-[var(--spacing-2xl)]">{actions}</div> : null}
    </div>
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const content = contentRef.current;
    if (!shell || !content || typeof ResizeObserver === "undefined") return;

    const updateHeight = () => {
      const styles = window.getComputedStyle(shell);
      const verticalChrome =
        Number.parseFloat(styles.paddingTop) +
        Number.parseFloat(styles.paddingBottom) +
        Number.parseFloat(styles.borderTopWidth) +
        Number.parseFloat(styles.borderBottomWidth);
      setHeight(content.offsetHeight + verticalChrome);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={shellRef}
      style={{
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-4xl)",
        height,
      }}
      className={cn("overflow-hidden bg-transparent transition-[height] duration-200 ease-out")}
    >
      <div
        ref={contentRef}
        className={cn(
          "filter-bar-content flex w-full flex-wrap items-end justify-end gap-x-[var(--spacing-4xl)] gap-y-[var(--spacing-lg)]",
          className,
        )}
      >
        <FilterBarContext.Provider value>{children}</FilterBarContext.Provider>
      </div>
    </div>
  );
}

export function ClearFiltersButton({ active, onClear }: { active: boolean; onClear: () => void }) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        "flex shrink-0 items-end overflow-hidden transition-[max-width,opacity] duration-200 ease-out",
        active ? "max-w-[140px] opacity-100" : "pointer-events-none max-w-0 opacity-0",
      )}
    >
      <Button
        size="medium"
        variant="ghost"
        tabIndex={active ? 0 : -1}
        className="whitespace-nowrap"
        onClick={onClear}
      >
        Clear filters
      </Button>
    </div>
  );
}
