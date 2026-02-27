import { useEffect, useRef, useState, } from "react";
interface VaultPathMarqueeProps {
  path: string;
  className?: string;
  icon?: "folder" | "obsidian";
}

function PrefixIcon({ icon, }: { icon: "folder" | "obsidian"; },) {
  if (icon === "obsidian") {
    return (
      <svg
        className="vault-path-icon-svg"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path d="M12 1.25L4.5 4.4L3.3 11.4L7.1 22H16.9L20.7 11.4L19.5 4.4L12 1.25Z" fill="#7C3AED" />
        <path d="M12 4.5L8.2 9.2L10.9 19H13.1L15.8 9.2L12 4.5Z" fill="#F5F3FF" />
        <path d="M8.2 9.2L5.9 11.7L7.7 18.3L10.9 19L8.2 9.2Z" fill="#A78BFA" />
        <path d="M15.8 9.2L18.1 11.7L16.3 18.3L13.1 19L15.8 9.2Z" fill="#5B21B6" />
      </svg>
    );
  }

  return (
    <span className="vault-path-icon-glyph" aria-hidden>
      📁
    </span>
  );
}

export function VaultPathMarquee({ path, className, icon = "folder", }: VaultPathMarqueeProps,) {
  const [isTruncated, setIsTruncated,] = useState(false,);
  const containerRef = useRef<HTMLDivElement>(null,);
  const staticRef = useRef<HTMLSpanElement>(null,);
  const normalizedClassName = className ? ` ${className}` : "";
  useEffect(() => {
    const container = containerRef.current;
    const staticEl = staticRef.current;
    if (!container || !staticEl) return;

    const measure = () => {
      setIsTruncated(staticEl.scrollWidth > container.clientWidth + 1,);
    };

    measure();
    const observer = new ResizeObserver(measure,);
    observer.observe(container,);
    observer.observe(staticEl,);

    return () => observer.disconnect();
  }, [path,],);

  return (
    <div
      ref={containerRef}
      className={`vault-path${isTruncated ? " vault-path--truncated" : ""}${normalizedClassName}`}
      title={path}
    >
      <span ref={staticRef} className="vault-path-static">
        <span className="vault-path-icon">
          <PrefixIcon icon={icon} />
        </span>
        <span className="vault-path-label">{path}</span>
      </span>
      {isTruncated && (
        <span className="vault-path-marquee-track" aria-hidden>
          <span className="vault-path-segment">
            <span className="vault-path-icon">
              <PrefixIcon icon={icon} />
            </span>
            <span>{path}</span>
          </span>
          <span className="vault-path-segment">
            <span className="vault-path-icon">
              <PrefixIcon icon={icon} />
            </span>
            <span>{path}</span>
          </span>
        </span>
      )}
    </div>
  );
}
