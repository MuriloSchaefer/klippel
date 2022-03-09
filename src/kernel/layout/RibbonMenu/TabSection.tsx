import React, { useState } from "react";
import { SectionName, StyledSection, SectionContent } from "./styles";
import {
  DropdownSectionContent,
  DropdownSectionIcon,
} from "./styles/TabSection";

interface TabSectionProps {
  name: string;
  children?: React.ReactNode;
  dropdownContent?: React.ReactNode;
}

const TabSection = ({
  name,
  children,
  dropdownContent,
}: TabSectionProps): React.ReactElement => {
  const [isDropdownOpen, setIsDropDownOpen] = useState(false);

  const handleDropDownToggle = () => {
    setIsDropDownOpen(!isDropdownOpen);
  };

  return (
    <StyledSection>
      <SectionContent>{children}</SectionContent>
      <SectionName
        onClick={handleDropDownToggle}
        hasDropdown={dropdownContent !== null}
      >
        {name}{" "}
        {dropdownContent && <DropdownSectionIcon open={isDropdownOpen} />}
      </SectionName>
      {dropdownContent && (
        <DropdownSectionContent open={isDropdownOpen}>
          {dropdownContent}
        </DropdownSectionContent>
      )}
    </StyledSection>
  );
};

TabSection.defaultProps = {
  children: null,
  dropdownContent: null,
};

export default TabSection;
