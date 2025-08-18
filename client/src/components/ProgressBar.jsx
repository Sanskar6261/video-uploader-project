export default function ProgressBar({ value = 0 }) {
  return (
    <div
      style={{
        width: "100%",
        background: "#eee",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: 12,
          background: "#4caf50",
          transition: "width 120ms linear",
        }}
      />
    </div>
  );
}
