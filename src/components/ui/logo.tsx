import { Heading, type HeadingProps } from "@chakra-ui/react";

interface LogoProps extends Omit<HeadingProps, "size"> {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: { fontSize: "md", letterSpacing: "-0.01em" },
  md: { fontSize: "xl", letterSpacing: "-0.01em" },
  lg: { fontSize: "2xl", letterSpacing: "-0.02em" },
  xl: { fontSize: "3xl", letterSpacing: "-0.02em" },
} as const;

export function Logo({ size = "md", ...props }: LogoProps) {
  const styles = sizeMap[size];
  return (
    <Heading
      fontFamily="var(--font-serif), serif"
      fontWeight="700"
      fontSize={styles.fontSize}
      letterSpacing="-0.01em"
      lineHeight="26.85px"
      {...props}
    >
      Workpals
    </Heading>
  );
}
