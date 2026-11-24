import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { ArrowDown, LoaderCircle } from "lucide-react";

const REFRESH_DISTANCE = 80;

export function PullToRefresh({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const gesture = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (disabled || refreshing || event.touches.length !== 1 || event.currentTarget.scrollTop > 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    let ancestor = target;
    while (ancestor && ancestor !== event.currentTarget) {
      const style = window.getComputedStyle(ancestor);
      if (/(auto|scroll)/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight) return;
      ancestor = ancestor.parentElement as HTMLElement;
    }
    gesture.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, active: false };
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || event.touches.length !== 1 || event.currentTarget.scrollTop > 0) {
      gesture.current = null;
      setDistance(0);
      return;
    }
    const deltaY = event.touches[0].clientY - start.y;
    const deltaX = event.touches[0].clientX - start.x;
    if (!start.active && Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      gesture.current = null;
      return;
    }
    if (deltaY > 10 && deltaY > Math.abs(deltaX)) start.active = true;
    setDistance(start.active ? Math.max(0, Math.min(deltaY * 0.5, 120)) : 0);
  };

  const handleTouchEnd = () => {
    gesture.current = null;
    if (distance >= REFRESH_DISTANCE) {
      setRefreshing(true);
      window.location.reload();
    }
    setDistance(0);
  };

  return (
    <div
      className="page-wash scroll-slim min-h-0 flex-1 overflow-y-auto overscroll-contain pb-20 sm:pb-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { gesture.current = null; setDistance(0); }}
    >
      {(distance > 0 || refreshing) && (
        <div className="sticky top-0 z-10 flex justify-center" role="status" aria-live="polite">
          <span className="absolute top-2 grid size-9 place-items-center rounded-full border border-border bg-card text-primary shadow-md" aria-label={refreshing ? "Refreshing" : distance >= REFRESH_DISTANCE ? "Release to refresh" : "Pull down to refresh"}>
            {refreshing ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowDown className="size-4" />}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
