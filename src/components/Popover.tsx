import { useIsMobile } from "@src/hooks/useIsMobile";
import {
  cloneElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Placement = "above-right" | "below-left";

export function Popover({
  placement,
  enableMobile = false,
  offset = 8,
  className,
  content,
  children,
}: {
  placement: Placement;
  enableMobile?: boolean;
  offset?: number;
  className?: string;
  content: (close: () => void) => ReactNode;
  // biome-ignore lint/suspicious/noExplicitAny: cloneElement requires any to inject ref + onClick
  children: ReactElement<any>;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function handleToggle() {
    if (!open && triggerRef.current) {
      if (enableMobile && isMobile) {
        setOpen((v) => !v);
        return;
      }
      const r = triggerRef.current.getBoundingClientRect();
      if (placement === "above-right") {
        setPos({
          bottom: window.innerHeight - r.top + offset,
          right: window.innerWidth - r.right,
        });
      } else {
        setPos({ top: r.bottom + offset, left: r.left });
      }
    }
    setOpen((v) => !v);
  }

  function close() {
    setOpen(false);
  }

  const trigger = cloneElement(children, {
    ref: triggerRef,
    onClick: handleToggle,
  });

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          enableMobile && isMobile ? (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="fixed inset-0 z-50 bg-black/40 cursor-default"
                onClick={close}
              />
              <div
                ref={panelRef}
                role="dialog"
                onKeyDown={(e) => e.key === "Escape" && close()}
                className={`fixed inset-x-0 bottom-0 z-50 glass-panel rounded-t-2xl border-t border-stroke p-5 max-h-[80vh] overflow-y-auto rise-in ${className ?? ""}`}
              >
                {content(close)}
              </div>
            </>
          ) : (
            <div
              ref={panelRef}
              style={pos}
              className={`fixed z-50 glass-panel rounded-xl border border-stroke p-4 rise-in ${className ?? ""}`}
            >
              {content(close)}
            </div>
          ),
          document.body,
        )}
    </>
  );
}
