"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadCard({
  name,
  accept,
  required,
  disabled,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function setFile(file: File | null) {
    setFileName(file?.name ?? null);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && inputRef.current) {
          const dt = new DataTransfer();
          dt.items.add(file);
          inputRef.current.files = dt.files;
          setFile(file);
        }
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-9 text-center transition-colors hover:border-accent/50 hover:bg-muted/40",
        dragOver && "border-accent bg-muted/60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required}
        disabled={disabled}
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {fileName ? (
        <>
          <FileSpreadsheet className="size-7 text-accent" />
          <div className="text-sm font-medium text-foreground">{fileName}</div>
          <div className="text-xs text-muted-foreground">
            Click o arrastrá otro archivo para cambiarlo
          </div>
        </>
      ) : (
        <>
          <UploadCloud className="size-7 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">
            Arrastrá tu archivo Excel aquí
          </div>
          <div className="text-xs text-muted-foreground">
            o hacé click para elegirlo — solo .xlsx
          </div>
        </>
      )}
    </div>
  );
}
