import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { openModelTool } from './openModel';
import { openModelShortcutTool } from './openModelShortcut';
import { createModelTool } from './createModel';
import { createModelShortcutTool } from './createModelShortcut';
import { switchViewTool } from './switchView';
import { switchViewShortcutTool } from './switchViewShortcut';
import { addMaterialTool } from './addMaterial';
import { addMaterialShortcutTool } from './addMaterialShortcut';
import { editMaterialTool } from './editMaterial';
import { editMaterialShortcutTool } from './editMaterialShortcut';
import { deleteMaterialTool } from './deleteMaterial';
import { deleteMaterialShortcutTool } from './deleteMaterialShortcut';
import { focusMaterialListTool } from './focusMaterialList';
import { cycleMaterialFocusTool } from './cycleMaterialFocus';
import { selectMaterialByLabelTool } from './selectMaterialByLabel';
import { editFocusedMaterialTool } from './editFocusedMaterial';
import { deleteFocusedMaterialTool } from './deleteFocusedMaterial';
import { openGarmentDetailsTool } from './openGarmentDetails';
import { openGarmentDetailsShortcutTool } from './openGarmentDetailsShortcut';
import { renameGarmentTool } from './renameGarment';
import { renameGarmentShortcutTool } from './renameGarmentShortcut';
import { addGraduationsTool } from './addGraduations';
import { addGraduationsShortcutTool } from './addGraduationsShortcut';
import { editGraduationTool } from './editGraduation';
import { editGraduationShortcutTool } from './editGraduationShortcut';
import { deleteGraduationTool } from './deleteGraduation';
import { deleteGraduationShortcutTool } from './deleteGraduationShortcut';
import { reorderGraduationTool } from './reorderGraduation';
import { reorderGraduationShortcutTool } from './reorderGraduationShortcut';
import { focusGraduationListTool } from './focusGraduationList';
import { cycleGraduationFocusTool } from './cycleGraduationFocus';
import { uploadVariationSVGTool } from './uploadVariationSVG';
import { uploadVariationSVGShortcutTool } from './uploadVariationSVGShortcut';
import { addVisualizationTool } from './addVisualization';
import { addVisualizationShortcutTool } from './addVisualizationShortcut';
import { editVisualizationTool } from './editVisualization';
import { editVisualizationShortcutTool } from './editVisualizationShortcut';
import { deleteVisualizationTool } from './deleteVisualization';
import { deleteVisualizationShortcutTool } from './deleteVisualizationShortcut';
import { addElectiveTool } from './addElective';
import { addElectiveShortcutTool } from './addElectiveShortcut';
import { editElectiveTool } from './editElective';
import { editElectiveShortcutTool } from './editElectiveShortcut';
import { deleteElectiveTool } from './deleteElective';
import { deleteElectiveShortcutTool } from './deleteElectiveShortcut';
import { focusElectiveListTool } from './focusElectiveList';
import { cycleElectiveFocusTool } from './cycleElectiveFocus';
import { addProcessTool } from './addProcess';
import { addProcessShortcutTool } from './addProcessShortcut';
import { editProcessTool } from './editProcess';
import { editProcessShortcutTool } from './editProcessShortcut';
import { deleteProcessTool } from './deleteProcess';
import { deleteProcessShortcutTool } from './deleteProcessShortcut';
import { focusProcessListTool } from './focusProcessList';
import { cycleProcessFocusTool } from './cycleProcessFocus';
import { linkProcessElectiveTool } from './linkProcessElective';
import { linkProcessElectiveShortcutTool } from './linkProcessElectiveShortcut';
import { linkProcessMaterialTool } from './linkProcessMaterial';
import { linkProcessMaterialShortcutTool } from './linkProcessMaterialShortcut';
import { openMaterialAuditLogTool } from './openMaterialAuditLog';
import { openMaterialAuditLogShortcutTool } from './openMaterialAuditLogShortcut';

const TOOLS = [
  openModelTool,
  openModelShortcutTool,
  createModelTool,
  createModelShortcutTool,
  switchViewTool,
  switchViewShortcutTool,
  addMaterialTool,
  addMaterialShortcutTool,
  editMaterialTool,
  editMaterialShortcutTool,
  deleteMaterialTool,
  deleteMaterialShortcutTool,
  focusMaterialListTool,
  cycleMaterialFocusTool,
  selectMaterialByLabelTool,
  editFocusedMaterialTool,
  deleteFocusedMaterialTool,
  openGarmentDetailsTool,
  openGarmentDetailsShortcutTool,
  renameGarmentTool,
  renameGarmentShortcutTool,
  addGraduationsTool,
  addGraduationsShortcutTool,
  editGraduationTool,
  editGraduationShortcutTool,
  deleteGraduationTool,
  deleteGraduationShortcutTool,
  reorderGraduationTool,
  reorderGraduationShortcutTool,
  focusGraduationListTool,
  cycleGraduationFocusTool,
  uploadVariationSVGTool,
  uploadVariationSVGShortcutTool,
  addVisualizationTool,
  addVisualizationShortcutTool,
  editVisualizationTool,
  editVisualizationShortcutTool,
  deleteVisualizationTool,
  deleteVisualizationShortcutTool,
  addElectiveTool,
  addElectiveShortcutTool,
  editElectiveTool,
  editElectiveShortcutTool,
  deleteElectiveTool,
  deleteElectiveShortcutTool,
  focusElectiveListTool,
  cycleElectiveFocusTool,
  addProcessTool,
  addProcessShortcutTool,
  editProcessTool,
  editProcessShortcutTool,
  deleteProcessTool,
  deleteProcessShortcutTool,
  focusProcessListTool,
  cycleProcessFocusTool,
  linkProcessElectiveTool,
  linkProcessElectiveShortcutTool,
  linkProcessMaterialTool,
  linkProcessMaterialShortcutTool,
  openMaterialAuditLogTool,
  openMaterialAuditLogShortcutTool,
];

export function registerMcpTools(server: McpServer) {
  TOOLS.forEach((tool) => {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: (tool as any).inputSchema,
      },
      (args: any) => (tool as any).execute(args),
    );
  });
}
