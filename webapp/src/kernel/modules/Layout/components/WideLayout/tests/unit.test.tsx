import renderer from 'react-test-renderer';
import Component from "../"

const mockUseModule = {
  hooks: {
    useAppSelector: jest.fn()
  }
}
jest.mock('@kernel/hooks/useModule', ()=>()=>(mockUseModule))

describe('WideLayout UI', () => {

  test('Prints the selected theme', () => {
    mockUseModule.hooks.useAppSelector.mockReturnValue('Theme')
    const component = renderer.create(
      <Component />,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
