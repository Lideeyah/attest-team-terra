"use client";
import {formCopy} from "@/lib/copy/forms";

import {
  useId,
  isValidElement,
  cloneElement,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type FieldProps = {
  label: string;
  /** Record-face note beneath the control. */
  note?: string;
  /** Replaces the note when the field is invalid. */
  error?: string;
  children: (id: string, invalid: boolean) => ReactNode;
};

export function Field({ label, note, error, children }: FieldProps) {
  const id = useId();
  const invalid = error !== undefined;
  const copy = formCopy(label);
  const control=children(id,invalid);
  const required=isValidElement<{required?:boolean}>(control)&&control.props.required;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {copy.label}<span className="field-requirement" aria-hidden="true">{required?'Required':'Optional'}</span>
      </label>
      {isValidElement<{'aria-describedby'?:string;'aria-label'?:string}>(control)?cloneElement(control,{'aria-label':copy.label,'aria-describedby':`${id}-help`}):control}
      {invalid ? (
        <p id={`${id}-help`} className="field-error">{error}</p>
      ) : note ? (
        <p id={`${id}-help`} className="field-note">{note}</p>
      ) : <p id={`${id}-help`} className="field-note">{copy.help}</p>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      className={["input", className].filter(Boolean).join(" ")}
      aria-invalid={invalid ? "true" : undefined}
      {...rest}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  options: { value: string; label: string }[];
};

export function Select({ invalid = false, options, className, ...rest }: SelectProps) {
  return (
    <select
      className={["select", className].filter(Boolean).join(" ")}
      aria-invalid={invalid ? "true" : undefined}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ invalid = false, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={["textarea", className].filter(Boolean).join(" ")}
      aria-invalid={invalid ? "true" : undefined}
      {...rest}
    />
  );
}

type PunchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

/** A square punch box. Checked fills bottle with a paper tick. */
export function Punch({ label, className, ...rest }: PunchProps) {
  return (
    <label className="punch-wrap">
      <input
        type="checkbox"
        className={["punch", className].filter(Boolean).join(" ")}
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
};

/** The one circle in the system. */
export function Radio({ label, className, ...rest }: RadioProps) {
  return (
    <label className="punch-wrap">
      <input
        type="radio"
        className={["radio", className].filter(Boolean).join(" ")}
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

type PickProps = {
  name: string;
  value: string;
  title: string;
  body: string;
  selected: boolean;
  onSelect: (value: string) => void;
};

/** Tactile selector card with a radio punch. Used for role selection. */
export function Pick({
  name,
  value,
  title,
  body,
  selected,
  onSelect,
}: PickProps) {
  return (
    <label className="pick" data-selected={selected ? "true" : "false"}>
      <input
        type="radio"
        className="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
      />
      <span className="stack">
        <span className="pick-title">{title}</span>
        <span className="pick-body">{body}</span>
      </span>
    </label>
  );
}
