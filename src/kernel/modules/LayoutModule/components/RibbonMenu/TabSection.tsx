import React, { useState } from "react";
import { SectionName, StyledSection, SectionContent } from "./styles";
import {
  DropdownSectionContent,
  DropdownSectionIcon,
} from "./styles/TabSection";

interface TabSectionProps {
  name: string;
  width?: string;
  children?: React.ReactNode;
  dropdownContent?: React.ReactNode;
}

export const TabSection = ({
  name,
  width,
  children,
  dropdownContent,
}: TabSectionProps): React.ReactElement => {
  const [isDropdownOpen, setIsDropDownOpen] = useState(false);

  const handleDropDownToggle = () => {
    setIsDropDownOpen(!isDropdownOpen);
  };

  return (
    <StyledSection width={width}>
      <SectionContent>{children}</SectionContent>
      {dropdownContent && (
        <DropdownSectionContent open={isDropdownOpen}>
          {dropdownContent}
        </DropdownSectionContent>
      )}
      <SectionName
        onClick={handleDropDownToggle}
        $hasdropdown={dropdownContent !== null}
      >
        {name}{" "}
        {dropdownContent && <DropdownSectionIcon open={isDropdownOpen} />}
      </SectionName>
    </StyledSection>
  );
};

TabSection.defaultProps = {
  children: null,
  dropdownContent: null,
  width: "fit-content",
};

export default TabSection;
