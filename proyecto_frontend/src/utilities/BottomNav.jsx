import { Flex, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { BatteryCharging, Home, BatteryLow } from "lucide-react";

const items = [
  { icon: Home, label: "Inicio", to: "/" },
  { icon: BatteryLow, label: "Consumo", to: "/consumption" },
  { icon: BatteryCharging, label: "Generación", to: "/weather" },
];

export default function BottomNav({ active }) {
  return (
    <Flex pos="fixed" bottom={0} w="100%" bg="green.600" justify="space-around" py="2">
      {items.map(({ icon: Icon, label, to }) => {
        const isActive = active === to; 
        return (
          <Link key={to} to={to}>
            <Flex
              direction="column"
              align="center"
              color={isActive ? "white" : "#d9d9d9"}
            >
              <Icon size={24} color={isActive ? "white" : "#d9d9d9"} />
              <Text fontSize="xs" fontWeight={isActive ? "bold" : "normal"}>
                {label}
              </Text>
            </Flex>
          </Link>
        );
      })}
    </Flex>
  );
}
