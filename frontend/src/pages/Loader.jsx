import "./Loader.css";

export default function Loader() {
  return (
    <div className="loader" role="status" aria-label="Loading">
      <div className="loader__dots">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} style={{ "--i": i }} />
        ))}
      </div>
      <p className="loader__text">Loading</p>
    </div>
  );
}