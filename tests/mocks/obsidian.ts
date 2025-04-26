import obsidianMock, { Vault as MockVault, ButtonComponent as RealButtonComponent } from './obsidian-mock';

export * from './obsidian-mock';
export default obsidianMock;
export const Vault = MockVault;
export const ButtonComponent = RealButtonComponent;
export const __esModule = true; 