import '@/styles/model-loader.css';

interface LoaderProps {
  /**
   * Real model-load progress 0–100. While a number is provided the bar and
   * text reflect it; when omitted (or null) the bar falls back to the
   * indeterminate demo animation.
   */
  progress?: number | null;
}

const Loader = ({ progress }: LoaderProps) => {
  const determinate = typeof progress === "number";
  const pct = determinate
    ? Math.max(0, Math.min(100, progress as number))
    : null;

  return (
    <div className="ml-container" role="status" aria-label="Loading AI model">
      <div
        className={`ml-bar${determinate ? " ml-bar--determinate" : ""}`}
        style={determinate ? { width: `${pct}%` } : undefined}
      />
      <div className="ml-text">
        {determinate ? `${Math.round(pct as number)}%` : "40%"}
      </div>
      <div className="ml-particles">
        <div className="ml-particle" />
        <div className="ml-particle" />
        <div className="ml-particle" />
        <div className="ml-particle" />
        <div className="ml-particle" />
      </div>
    </div>
  );
};

export default Loader;
