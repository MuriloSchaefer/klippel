import React from "react";
import GarmentDetails from "./GarmentDetails";

interface DetailPanelProps {
  variationId: string;
  selectedPart: string;
}

const DetailPanel: React.FC<DetailPanelProps> = ({
  variationId,
  selectedPart = "garment",
}) => {
  
    const components: { [key: string]: React.ReactNode } = {
      garment: <GarmentDetails variationId={variationId} selectedPart={selectedPart} />,
    };

    return selectedPart in components ? components[selectedPart] : <>Detalhes não disponíveis para {selectedPart}</>;
};

export default DetailPanel;
