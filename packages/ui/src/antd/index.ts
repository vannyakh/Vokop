export { AntdProvider } from './AntdProvider.js';
export { ThemeProvider, useTheme, type ThemeProviderProps } from './ThemeProvider.js';
export {
  applyUiThemeToDocument,
  cycleUiTheme,
  getAntdThemeConfig,
  getUiThemeTokens,
  isDarkUiTheme,
  isUiTheme,
  readStoredUiTheme,
  SYSTEM_CONFIG,
  THEME_TOKENS,
  UI_SYSTEM_CONFIG,
  UI_THEME_TOKENS,
  writeStoredUiTheme,
} from './theme.js';
export type { UiTheme, UiThemeContextValue, UiThemeTokens } from './types.js';

/** Shared Ant Design primitives — import from `@vokop/ui/antd`, not `antd` directly in apps. */
export {
  Popover,
  Popconfirm,
  ConfigProvider,
  Select,
  Segmented,
  Tooltip,
  DatePicker,
  Modal,
  Table,
  Form,
  Input,
  InputNumber,
  Button as AntdButton,
  Dropdown,
  Menu,
  Drawer,
  Spin,
  Tabs,
  Divider,
  Switch,
  message,
  theme,
} from 'antd';

export type {
  PopoverProps,
  PopconfirmProps,
  SelectProps,
  SegmentedProps,
  TooltipProps,
  ModalProps,
  TableProps,
  FormProps,
  InputProps,
  InputNumberProps,
  DropdownProps,
  MenuProps,
  DrawerProps,
  TabsProps,
  DividerProps,
} from 'antd';
