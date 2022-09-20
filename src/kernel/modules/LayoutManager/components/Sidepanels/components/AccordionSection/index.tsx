import React from "react";
import styled from "styled-components";

const StyledAccordionSection = styled.details`
  width: 100%;
  display: flex;
  flex-direction: column;
`;
const AccordionTitle = styled.summary`
  display: block;
  background-color: #800747;
  color: #fff;
  text-align: center;
  cursor: pointer;
  padding: 5px 3px;
`;
const AccordionContent = styled("div")`
  height: "auto";
  overflow: hidden;
  background-color: #a55b81;
  color: #fff;
  padding: 5px;
  -webkit-transition: height 0.3s ease-in-out;
  -moz-transition: height 0.3s ease-in-out;
  -o-transition: height 0.3s ease-in-out;
  -ms-transition: height 0.3s ease-in-out;
  transition: height 0.4s ease-in-out;
`;

export interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
}

const AccordionSection = ({ title, children }: AccordionSectionProps) => (
  <StyledAccordionSection>
    <AccordionTitle>{title}</AccordionTitle>
    <AccordionContent>{children}</AccordionContent>
  </StyledAccordionSection>
);

export default AccordionSection;
