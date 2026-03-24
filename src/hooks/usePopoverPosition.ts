import { MOBILE_BREAKPOINT } from "@src/lib/constants";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

type Placement = "above-right" | "below-left";

interface UsePopoverPositionOptions {
  placement: Placement;
  offset?: number;
  enableMobile?: boolean;
}

export function usePopoverPosition({
  placement,
  offset = 8,
  enableMobile = false,
}: UsePopoverPositionOptions): {
  open: boolean;
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  isMobile: boolean;
  pos: { top?: number; bottom?: number; left?: number; right?: number };
  buttonRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  handleToggle: () => void;
} {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      if (enableMobile) {
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;
        setIsMobile(mobile);
        if (mobile) {
          setOpen((v) => !v);
          return;
        }
      }
      const r = buttonRef.current.getBoundingClientRect();
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

  return { open, setOpen, isMobile, pos, buttonRef, popoverRef, handleToggle };
}
