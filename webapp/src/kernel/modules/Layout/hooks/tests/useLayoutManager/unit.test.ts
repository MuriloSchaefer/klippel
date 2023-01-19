import { switchTheme } from "@kernel/modules/Layout/store/actions";
import useLayoutManager from "../../useLayoutManager";

export {}

const mockUseModule = {
  hooks: {
    useAppDispatch: jest.fn()
  }
}
jest.mock('@kernel/hooks/useModule', ()=>()=>(mockUseModule))

describe('Layout Manager hook ', () => {

  describe('Set theme', ()=> {
    test('it dispatch action to set theme', () => {
      const dispatchMock = jest.fn()
      mockUseModule.hooks.useAppDispatch.mockReturnValue(dispatchMock)
  
      const hook = useLayoutManager()
      hook.functions.setTheme('dark')
      expect(dispatchMock).toBeCalledWith(switchTheme({theme:'dark'})) // force failure

      hook.functions.setTheme('light')
      expect(dispatchMock).toBeCalledWith(switchTheme({theme:'light'}))
    });
    
  })

});
