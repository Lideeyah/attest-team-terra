import type { ReactNode } from "react";

type EmptyStateProps = {
  /** One line stating what is not here yet. */
  line: string;
  /** One action, if there is a real one. */
  action?: ReactNode;
};

export function EmptyState({ line, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <p className="empty-line">{line}</p>
      {action}
    </div>
  );
}
