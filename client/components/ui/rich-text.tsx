import React, { useEffect, useRef } from "react";

export default function RichTextTextarea({
  value,
  onChange,
  rows = 6,
  className = "",
  placeholder = "",
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Update innerHTML only if different to avoid resetting cursor
    if (value !== el.innerHTML) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command: string, valueArg?: string) => {
    try {
      // Use legacy execCommand for simplicity (works for bold/italic/underline/createLink)
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand(command, false, valueArg);
      // Emit updated html
      const el = ref.current;
      if (el) onChange(el.innerHTML);
    } catch (e) {
      // Fallback: do nothing
    }
  };

  const onInput = () => {
    const el = ref.current;
    if (el) onChange(el.innerHTML);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Allow Ctrl/Cmd+B/I/U native behavior
    if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "i" || e.key === "u")) {
      e.preventDefault();
      if (e.key === "b") exec("bold");
      if (e.key === "i") exec("italic");
      if (e.key === "u") exec("underline");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={() => exec("bold")} className="px-3 py-1 rounded-md border border-gray-border hover:bg-black/5 text-sm font-bold">B</button>
        <button type="button" onClick={() => exec("italic")} className="px-3 py-1 rounded-md border border-gray-border hover:bg-black/5 text-sm italic">I</button>
        <button type="button" onClick={() => exec("underline")} className="px-3 py-1 rounded-md border border-gray-border hover:bg-black/5 text-sm">U</button>
        <button type="button" onClick={() => exec("insertHTML", "<br/>") } className="px-3 py-1 rounded-md border border-gray-border hover:bg-black/5 text-sm">BR</button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Enter URL (https://...):", "https://");
            if (!url) return;
            exec("createLink", url);
          }}
          className="px-3 py-1 rounded-md border border-gray-border hover:bg-black/5 text-sm"
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => exec("unlink")}
          className="px-3 py-1 rounded-md border border-gray-border hover:bg-black/5 text-sm"
        >
          Unlink
        </button>
      </div>

      <div className="relative">
      {(!value || value === "") && placeholder ? (
        <div className="absolute top-3 left-3 pointer-events-none text-sm text-gray-text/60">{placeholder}</div>
      ) : null}

      <div
        id={id}
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        suppressContentEditableWarning
        onInput={onInput}
        onKeyDown={onKeyDown}
        className={"w-full min-h-[120px] rounded-xl border border-gray-border p-3 font-lufga text-base text-gray-text bg-white/0 " + className}
        style={{ minHeight: rows * 24 }}
      />
    </div>
    </div>
  );
}
