import React from "react";

const MaterialPreviewCircle = ({ color, r }: { color: string; r: number }) => (
  <svg height={r * 2} width={r * 2}>
    <circle r={r} cx={r} cy={r} fill={color} />
  </svg>
);

export default MaterialPreviewCircle;
