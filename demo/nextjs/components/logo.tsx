import type { SVGProps } from "react";
import Image from "next/image";

export const Logo = (props: SVGProps<any>) => {
  return (
    <Image
      src="/logo.png"
      alt="CinaAuth"
      width={28}
      height={28}
      className="w-5 h-5"
      priority
    />
  );
};
