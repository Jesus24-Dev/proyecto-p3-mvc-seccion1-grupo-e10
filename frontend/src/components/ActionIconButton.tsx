import type { MouseEventHandler } from "react";

type ActionIconButtonProps = {
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  tone?: "default" | "danger";
  type: "edit" | "delete";
};

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 20h4l10.4-10.4-4-4L4 16v4Zm2.4-1.6H6v-.4l8.6-8.6.4.4-8.6 8.6ZM19 7l-2-2 1.1-1.1a1 1 0 0 1 1.4 0l.6.6a1 1 0 0 1 0 1.4L19 7Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 11a2 2 0 0 1-2-2V8h16v10a2 2 0 0 1-2 2H6Z" />
    </svg>
  );
}

export function ActionIconButton({
  label,
  onClick,
  tone = "default",
  type,
}: ActionIconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${tone === "danger" ? "icon-button-danger" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {type === "edit" ? <EditIcon /> : <DeleteIcon />}
    </button>
  );
}
