import { Flex, Text } from "@chakra-ui/react";
import { FiHome, FiBarChart2, FiSun } from "react-icons/fi";
import { Link } from "react-router-dom";

const items = [
  { icon: FiHome,    label: "Inicio",      to: "/" },
  { icon: FiBarChart2,label: "Consumo",     to: "/consumption" },
  { icon: FiSun,     label: "Generación",  to: "/generation" }
];

export default function BottomNav({ active }) {
  return (
    <Flex pos="fixed" bottom={0} w="100%" bg="green.600" justify="space-around" py="2">
      {items.map(({ icon: Icon, label, to }) => {
        const isActive = to.includes(active);
        return (
          <Link key={to} to={to}>
            <Flex direction="column" align="center" color={isActive?"whiteAlpha.900":"whiteAlpha.600"}>
              <Icon size="24"/>
              <Text fontSize="xs">{label}</Text>
            </Flex>
          </Link>
        );
      })}
    </Flex>
  );
}
