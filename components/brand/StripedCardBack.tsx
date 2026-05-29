// Dos de carte mystère — rayures vin de marque + disque crème avec "T".
export function StripedCardBack({
  w = 150,
  h = 210,
  label = "T",
}: {
  w?: number;
  h?: number;
  label?: string;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 14,
        position: "relative",
        overflow: "hidden",
        background:
          "repeating-linear-gradient(45deg, var(--wine) 0 14px, #6A1622 14px 28px)",
        boxShadow:
          "0 14px 30px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: w * 0.42,
          height: w * 0.42,
          borderRadius: "50%",
          background: "#FBF7EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--ff-display)",
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: w * 0.22,
          color: "var(--wine)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
