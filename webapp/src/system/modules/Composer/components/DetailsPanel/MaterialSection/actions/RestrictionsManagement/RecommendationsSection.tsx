import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";


import { RestrictionsProps } from "./Container";
import _ from "lodash";

export default (props: RestrictionsProps) => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { CRUDGrid } = layoutModule.components;



  return (
    <Box role="restrictions-management-container">
      <Typography variant="h4">Contra indicações do material</Typography>
      <Typography component="div">
        <p>A tabela abaixo mostra contra indicações para este material.</p>
      </Typography>
      <CRUDGrid
        newRecord={() => ({id: _.uniqueId('recommendations-')})}
        columns={[]}
      />
    </Box>
  );
};
