import type { CompoundValue } from "@system/modules/Converter/typings";
import type { GraduationBreakdownEntry } from "../../../typings";

/**
 * Represents a unit conversion applied to a material attribute
 */
export type AttributeConversion = {
  name: string;
  originalValue: number;
  originalUnit: string;
  convertedValue: number;
  convertedUnit: string;
};

export type ConversionStep = {
  from: string;
  to: string;
  expression: string;
  context: { [key: string]: number };
  result: number;
};

export type ComputationStep = {
  processLabel: string;
  edgeAmount: CompoundValue;
  convertedAmount: number;
  runningTotal: number;
  targetUnits: {
    quotient: string;
    dividend: string;
  };
  conversionSteps: ConversionStep[];
  attributeConversions: AttributeConversion[];
  error?: string;
  graduationBreakdown?: GraduationBreakdownEntry[];
};
