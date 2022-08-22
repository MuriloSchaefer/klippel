import React from "react";

export default (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <button type="button" {...props}>
    +
  </button>
);
