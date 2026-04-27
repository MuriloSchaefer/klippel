import { useMemo } from "react";
import { Box, Divider, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IConverterModule } from "@system/modules/Converter";
import type { MaterialNode } from "../../../../typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import { useMaterialCostComputation } from "../hooks/useMaterialCostComputation";

export default function MaterialCostAuditContent({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const theme = useTheme();
  const converterModule = useModule<IConverterModule>("Converter");
  const useUnits = converterModule.hooks.useUnits;
  
  const { cost, total, steps } = useMaterialCostComputation({ variationId, node, material });

  // Collect all unit IDs that need to be fetched
  const allUnitIds = useMemo(() => {
    const ids = new Set<string>();
    if (material.stock?.unit) ids.add(material.stock.unit);
    if (cost?.quotient.unit) ids.add(cost.quotient.unit);
    if (cost?.dividend.unit) ids.add(cost.dividend.unit);
    
    // Add units from material attributes
    if (material.attributes) {
      Object.values(material.attributes).forEach((value: any) => {
        if (typeof value === 'object' && value !== null) {
          if ('quotient' in value && 'dividend' in value) {
            if (value.quotient?.unit) ids.add(value.quotient.unit);
            if (value.dividend?.unit) ids.add(value.dividend.unit);
          } else if ('unit' in value) {
            ids.add(value.unit);
          }
        }
      });
    }
    
    steps.forEach(step => {
      if (step.edgeAmount.quotient.unit) ids.add(step.edgeAmount.quotient.unit);
      if (step.edgeAmount.dividend.unit) ids.add(step.edgeAmount.dividend.unit);
      if (step.targetUnits.quotient) ids.add(step.targetUnits.quotient);
      if (step.targetUnits.dividend) ids.add(step.targetUnits.dividend);
      // Add units from conversion steps
      step.conversionSteps.forEach(convStep => {
        ids.add(convStep.from);
        ids.add(convStep.to);
      });
      // Add units from attribute conversions
      step.attributeConversions?.forEach(attrConv => {
        ids.add(attrConv.originalUnit);
        ids.add(attrConv.convertedUnit);
      });
    });
    return Array.from(ids);
  }, [material.stock?.unit, material.attributes, cost, steps]);

  const units = useUnits(allUnitIds);

  const stockAbbreviation = material.stock && units?.[material.stock.unit]?.abbreviation;
  const costAbbreviation = cost && units?.[cost.quotient.unit]?.abbreviation;
  const dividendAbbreviation = cost && units?.[cost.dividend.unit]?.abbreviation;

  return (
    <Box 
      sx={{ 
        minWidth: 400, 
        maxWidth: 600, 
        maxHeight: '70vh', 
        overflowY: 'auto',
        userSelect: 'text',
        cursor: 'text',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Auditoria de Custo - {node.label}
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        Material: {material.stock && (
          <>
            {material.stock.amount} {stockAbbreviation || material.stock.unit}
          </>
        )}
      </Typography>

      {/* Material Attributes Section */}
      {material.attributes && Object.keys(material.attributes).length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: theme.palette.info.main + "10", borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Atributos do Material (Variáveis de Contexto):
          </Typography>
          {Object.entries(material.attributes).map(([key, value]) => {
            // Check if this attribute was converted in any step
            const wasConverted = steps.some(step => 
              step.attributeConversions?.some(conv => 
                conv.name === key || conv.name === `${key}Quociente`
              )
            );
            
            // Handle compound values - they get expanded into Quociente/Dividendo
            if (typeof value === 'object' && value !== null && 'quotient' in value && 'dividend' in value) {
              const quotientUnit = units?.[value.quotient.unit]?.abbreviation || value.quotient.unit;
              const dividendUnit = units?.[value.dividend.unit]?.abbreviation || value.dividend.unit;
              return (
                <Box key={key} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontWeight: 500 }}>
                    {key}: {value.quotient.amount} {quotientUnit} / {dividendUnit}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', ml: 2, color: theme.palette.text.secondary }}>
                    → <strong>{key}Quociente</strong> = {value.quotient.amount} (usado nas expressões)
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', ml: 2, color: theme.palette.text.secondary }}>
                    → <strong>{key}Dividendo</strong> = {value.dividend.amount} (usado nas expressões)
                  </Typography>
                  {wasConverted && (
                    <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', ml: 2, color: theme.palette.warning.main, fontSize: '0.65rem' }}>
                      ⚠ O quociente desta variável será convertido automaticamente para a unidade de destino nas expressões
                    </Typography>
                  )}
                </Box>
              );
            } else if (typeof value === 'object' && value !== null && 'amount' in value && 'unit' in value) {
              const unitAbbr = units?.[value.unit]?.abbreviation || value.unit;
              return (
                <Box key={key} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    <strong>{key}</strong> = {value.amount} {unitAbbr}
                  </Typography>
                  {wasConverted && (
                    <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', ml: 2, color: theme.palette.warning.main, fontSize: '0.65rem' }}>
                      ⚠ Esta variável será convertida automaticamente para a unidade de destino nas expressões
                    </Typography>
                  )}
                </Box>
              );
            } else {
              return (
                <Typography key={key} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                  <strong>{key}</strong> = {String(value)}
                </Typography>
              );
            }
          })}
        </Box>
      )}
      
      {steps.length === 0 ? (
        <Typography color={theme.palette.text.secondary}>
          Nenhum processo consome este material
        </Typography>
      ) : (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Passos de Computação:
          </Typography>
          {steps.map((step, index) => {
            const edgeQuotientAbbr = units?.[step.edgeAmount.quotient.unit]?.abbreviation;
            const edgeDividendAbbr = units?.[step.edgeAmount.dividend.unit]?.abbreviation;
            const targetQuotientAbbr = units?.[step.targetUnits.quotient]?.abbreviation;
            const targetDividendAbbr = units?.[step.targetUnits.dividend]?.abbreviation;
            return (
              <Box key={index} sx={{ mb: 2, p: 2, bgcolor: step.error ? theme.palette.error.main + "10" : theme.palette.background.default, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Passo {index + 1}: {step.processLabel}
                </Typography>
                <Typography variant="caption" color={theme.palette.text.secondary}>
                  Consumo original: {step.edgeAmount.quotient.amount.toFixed(2)}{" "}
                  {edgeQuotientAbbr} / {edgeDividendAbbr}
                </Typography>
                
                {/* Show error if conversion failed */}
                {step.error && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: theme.palette.error.main + "20", borderRadius: 0.5 }}>
                    <Typography variant="caption" sx={{ display: 'block', color: theme.palette.error.main, fontWeight: 500 }}>
                      ❌ Erro de Conversão
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: theme.palette.error.dark }}>
                      {step.error}
                    </Typography>
                  </Box>
                )}
                
                {/* Attribute conversions - show if any attributes were auto-converted */}
                {step.attributeConversions && step.attributeConversions.length > 0 && (
                  <Box sx={{ mt: 1, ml: 2, pl: 2, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontStyle: 'italic', display: 'block', mb: 0.5, color: theme.palette.warning.main }}>
                      ⚠ Conversões Automáticas de Atributos:
                    </Typography>
                    {step.attributeConversions.map((attrConv, attrIndex) => {
                      const originalAbbr = units?.[attrConv.originalUnit]?.abbreviation || attrConv.originalUnit;
                      const convertedAbbr = units?.[attrConv.convertedUnit]?.abbreviation || attrConv.convertedUnit;
                      return (
                        <Box key={attrIndex} sx={{ mb: 0.5, p: 1, bgcolor: theme.palette.warning.main + "10", borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            <strong>{attrConv.name}</strong>: {attrConv.originalValue} {originalAbbr} → {attrConv.convertedValue.toFixed(4)} {convertedAbbr}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                
                {/* Detailed conversion steps */}
                {step.conversionSteps.length > 0 && (
                  <Box sx={{ mt: 1, ml: 2, pl: 2, borderLeft: `2px solid ${theme.palette.divider}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontStyle: 'italic', display: 'block', mb: 0.5 }}>
                      Passos de Conversão:
                    </Typography>
                    {step.conversionSteps.map((convStep, convIndex) => {
                      const fromAbbr = units?.[convStep.from]?.abbreviation || convStep.from;
                      const toAbbr = units?.[convStep.to]?.abbreviation || convStep.to;
                      
                      // Separate material attributes from computed values
                      const materialVars: string[] = [];
                      const computedVars: string[] = [];
                      
                      Object.entries(convStep.context).forEach(([key, value]) => {
                        const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
                        const varStr = `${key}=${formattedValue}`;
                        
                        if (['quantidade', 'quantidadeQuociente', 'quantidadeDividendo'].includes(key)) {
                          computedVars.push(varStr);
                        } else {
                          materialVars.push(varStr);
                        }
                      });
                      
                      return (
                        <Box key={convIndex} sx={{ mb: 1, p: 1, bgcolor: theme.palette.background.paper, borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 500 }}>
                            {convIndex + 1}. {fromAbbr} → {toAbbr}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            Expressão: {convStep.expression}
                          </Typography>
                          {materialVars.length > 0 && (
                            <Typography variant="caption" sx={{ display: 'block', color: theme.palette.info.main }}>
                              <strong>Atributos do material:</strong> {materialVars.join(', ')}
                            </Typography>
                          )}
                          {computedVars.length > 0 && (
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              <strong>Valores calculados:</strong> {computedVars.join(', ')}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ display: 'block', color: theme.palette.success.main, fontWeight: 500 }}>
                            Resultado: {convStep.result.toFixed(4)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                
                {!step.error && (
                  <>
                    <br />
                    <Typography variant="caption" color={theme.palette.text.secondary}>
                      Convertido para: {step.convertedAmount.toFixed(2)} {costAbbreviation}
                    </Typography>
                    <br />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      Total acumulado: {step.runningTotal.toFixed(2)} {costAbbreviation} / {dividendAbbreviation}
                    </Typography>
                  </>
                )}

                {step.graduationBreakdown && step.graduationBreakdown.length > 0 && (
                  <Box sx={{ mt: 1, ml: 2, pl: 2, borderLeft: `2px solid ${theme.palette.info.main}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontStyle: 'italic', display: 'block', mb: 0.5, color: theme.palette.info.main }}>
                      Detalhamento por graduação:
                    </Typography>
                    {step.graduationBreakdown.map((entry) => {
                      const consumptionQuotientAbbr = units?.[entry.consumption.quotient.unit]?.abbreviation || entry.consumption.quotient.unit;
                      const consumptionDividendAbbr = units?.[entry.consumption.dividend.unit]?.abbreviation || entry.consumption.dividend.unit;
                      return (
                        <Box key={entry.graduationId} sx={{ mb: 0.5, p: 1, bgcolor: theme.palette.info.main + "10", borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            <strong>{entry.graduationLabel}</strong> ({entry.garmentAmount} un):
                            {" "}{entry.consumption.quotient.amount} {consumptionQuotientAbbr} / {consumptionDividendAbbr}
                            {entry.gradeDelta !== undefined && (
                              <> · {entry.gradeDelta >= 0 ? "+" : ""}{entry.gradeDelta.toFixed(1)}%</>
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem', color: theme.palette.text.secondary }}>
                            → {entry.convertedAmount.toFixed(4)} {costAbbreviation} × {entry.garmentAmount} = {entry.contribution.toFixed(2)} {costAbbreviation}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ p: 2, bgcolor: theme.palette.primary.main + "15", borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Consumo por unidade:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
              {cost?.quotient.amount.toFixed(2)} {costAbbreviation} / {dividendAbbreviation}
            </Typography>
            {total && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>
                  Total considerando graduações:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                  {total.quotient.amount.toFixed(2)} {costAbbreviation}
                </Typography>
              </>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
