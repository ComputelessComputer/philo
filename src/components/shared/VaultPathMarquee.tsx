import { useEffect, useRef, useState, } from "react";
import obsidianLogo from "../../assets/2023_Obsidian_logo.svg";
interface VaultPathMarqueeProps {
  path: string;
  className?: string;
  icon?: "folder" | "obsidian";
}

function PrefixIcon({ icon, }: { icon: "folder" | "obsidian"; },) {
  if (icon === "obsidian") {
    return (
      <img
        className="vault-path-icon-svg"
        src={obsidianLogo}
        alt=""
        aria-hidden
      />
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
