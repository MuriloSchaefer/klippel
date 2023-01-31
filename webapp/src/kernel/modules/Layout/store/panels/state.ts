export interface SettingsPanelState {
    state: 'expanded' | 'collapsed'
}
export interface DetailsPanelState {
    state: 'opened' | 'closed'
}
export interface PanelsState {
    settings: SettingsPanelState;
    details: DetailsPanelState;
}

export const initialState: PanelsState = {
    settings: {
        state: 'expanded'
    },
    details: {
        state: 'closed'
    }
}

export default initialState