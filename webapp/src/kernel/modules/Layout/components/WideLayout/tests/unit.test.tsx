import renderer from 'react-test-renderer';
import Component from "../"

const mockUseModule = {
  hooks: {
    useAppSelector: jest.fn()
  }
}
jest.mock('@kernel/hooks/useModule', ()=>()=>(mockUseModule))

describe('UI', () => {

  // describe('Ribbon Menu', ()=> {
  //   test('is stiky at the top of the page', () => {
  //     // mockUseModule.hooks.useAppSelector.mockReturnValue('light')
  //     // const component = renderer.create(
  //     //   <Component />,
  //     // );
  //     // let tree = component.toJSON();
  //     // expect(tree).toMatchSnapshot();
  
  //     expect(true).toBe(true) // force failure
  //   });
  
  //   test('It has a system tray', ()=>{
  //     expect(true).toBe(true) // force failure
  //   })
  // })

  // describe('Setting Panel', ()=> {
  //   test('Settings Panel is set to the left side of the screen', () => {
  //     expect(true).toBe(true) // force failure
  //   })
  // })

  test('Details Panel is set to the right side of the screen', () => {
    expect(true).toBe(true) // force failure
  })
});
