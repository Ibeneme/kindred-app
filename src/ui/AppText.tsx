// src/components/ui/AppText.tsx (or wherever you keep it)
import React from "react";
import { Text, TextProps } from "react-native";

interface AppTextProps extends TextProps {
  type?: "regular" | "medium" | "bold";
}

export const AppText = ({
  style,
  type = "regular",
  ...props
}: AppTextProps) => {
  const getFontFamily = () => {
    switch (type) {
      case "bold":
        return "DMSansBold";
      case "medium":
        return "DMSansMedium";
      default:
        return "DMSansRegular";
    }
  };

  return (
    <Text
      style={[{ fontFamily: getFontFamily(), color: "#111827" }, style]}
      {...props}
    />
  );
};
