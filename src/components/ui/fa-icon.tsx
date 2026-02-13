import { cn } from "@/lib/utils";

type FaStyle = "solid" | "regular" | "light" | "thin" | "duotone" | "brands" | "sharp-solid";

const stylePrefix: Record<FaStyle, string> = {
  solid: "fa-solid",
  regular: "fa-regular",
  light: "fa-light",
  thin: "fa-thin",
  duotone: "fa-duotone",
  brands: "fa-brands",
  "sharp-solid": "fa-sharp fa-solid",
};

interface FaIconProps {
  icon: string;
  style?: FaStyle;
  className?: string;
  fixedWidth?: boolean;
}

export function FaIcon({
  icon,
  style = "solid",
  className,
  fixedWidth = false,
}: FaIconProps) {
  return (
    <i
      className={cn(
        stylePrefix[style],
        `fa-${icon}`,
        fixedWidth && "fa-fw",
        className
      )}
      aria-hidden="true"
    />
  );
}
