import type { ColorValue } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export type IconName =
  | "home"
  | "feed"
  | "floors"
  | "model"
  | "flat"
  | "admin"
  | "people"
  | "bell"
  | "mail"
  | "form"
  | "gate"
  | "schedule"
  | "poll"
  | "user"
  | "back"
  | "more";

const stroke = {
  fill: "none" as const,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Icon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths(name, color)}
    </Svg>
  );
}

export function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Icon name={name} color={typeof color === "string" ? color : "#059669"} size={size} />
  );
}

function paths(name: IconName, color: string) {
  const pen = { ...stroke, stroke: color };
  switch (name) {
    case "home":
      return <Path {...pen} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />;
    case "feed":
      return <Path {...pen} d="M5 7h14M5 12h14M5 17h9" />;
    case "floors":
      return (
        <>
          <Path {...pen} d="M4 20V8l8-4 8 4v12" />
          <Path {...pen} d="M9 20v-6h6v6" />
          <Path {...pen} d="M4 12h16" />
        </>
      );
    case "model":
      return (
        <>
          <Path {...pen} d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <Path {...pen} d="M12 12 20 7.5M12 12v9M12 12 4 7.5" />
        </>
      );
    case "flat":
      return (
        <>
          <Path {...pen} d="M7 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
          <Path {...pen} d="M4 21h16M10 8h.01M14 8h.01M10 12h.01M14 12h.01M10 16h.01M14 16h.01" />
        </>
      );
    case "admin":
      return (
        <>
          <Path {...pen} d="M12 3 4.5 6.5v4.2c0 4.6 3.1 8.9 7.5 10.3 4.4-1.4 7.5-5.7 7.5-10.3V6.5L12 3Z" />
          <Path {...pen} d="m9.5 12 1.8 1.8 3.7-3.8" />
        </>
      );
    case "people":
      return (
        <>
          <Path {...pen} d="M16 19v-1.2A3.3 3.3 0 0 0 12.7 14.5H8.3A3.3 3.3 0 0 0 5 17.8V19" />
          <Circle {...pen} cx="10.5" cy="8.5" r="2.7" />
          <Path {...pen} d="M19 19v-1a2.8 2.8 0 0 0-2-2.7" />
          <Path {...pen} d="M15.2 8.6a2.4 2.4 0 1 0-1.3-4.4" />
        </>
      );
    case "bell":
      return (
        <>
          <Path {...pen} d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 1 0-8.6 0v4.7L6.5 16.5Z" />
          <Path {...pen} d="M10 18.2a2 2 0 0 0 4 0" />
        </>
      );
    case "mail":
      return (
        <>
          <Path {...pen} d="M4 7h16v10H4V7Z" />
          <Path {...pen} d="m4 8 8 5 8-5" />
        </>
      );
    case "form":
      return (
        <>
          <Path {...pen} d="M8 4h6l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <Path {...pen} d="M14 4v4h4M9 13h6M9 17h6" />
        </>
      );
    case "gate":
      return (
        <>
          <Path {...pen} d="M4 21V8h16v13" />
          <Path {...pen} d="M4 12h16M12 12v9" />
        </>
      );
    case "schedule":
      return (
        <>
          <Path {...pen} d="M5 5h14v15H5V5Z" />
          <Path {...pen} d="M8 3v4M16 3v4M5 10h14" />
        </>
      );
    case "poll":
      return (
        <>
          <Path {...pen} d="M5 19V11M12 19V5M19 19v-6" />
        </>
      );
    case "user":
      return (
        <>
          <Circle {...pen} cx="12" cy="8" r="3" />
          <Path {...pen} d="M6.2 19.2v-.8A3.8 3.8 0 0 1 10 14.6h4a3.8 3.8 0 0 1 3.8 3.8v.8" />
        </>
      );
    case "back":
      return <Path {...pen} d="M15 5 8 12l7 7" />;
    case "more":
      return (
        <>
          <Circle {...pen} cx="6" cy="12" r="1.25" />
          <Circle {...pen} cx="12" cy="12" r="1.25" />
          <Circle {...pen} cx="18" cy="12" r="1.25" />
        </>
      );
  }
}
